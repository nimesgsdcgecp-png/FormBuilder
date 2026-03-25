package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.exception.ExpressionEvaluationException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * ExpressionEvaluatorService — Safe Boolean Expression Evaluator
 * 
 * Replaces the vulnerable IF->THEN engine / SpEL with a strict recursive descent parser.
 * Only supports boolean logic and basic comparisons on data. No method reflection.
 */
@Service
public class ExpressionEvaluatorService {

    public boolean evaluate(String expression, Map<String, Object> fieldValues) {
        if (expression == null || expression.isBlank()) return true;
        Tokenizer tokenizer = new Tokenizer(expression);
        List<Token> tokens = tokenizer.tokenize();
        if (tokens.isEmpty()) return true;
        
        Parser parser = new Parser(tokens, fieldValues);
        Object result = parser.parseExpression();
        
        if (result instanceof Boolean) {
            return (Boolean) result;
        }
        throw new ExpressionEvaluationException("Expression did not return a boolean result", "EVAL_ERR", "PARSER");
    }

    // ─── Tokenizer ─────────────────────────────────────────
    enum TokenType {
        IDENTIFIER, STRING, NUMBER,
        EQ_EQ, NOT_EQ, LT, LTE, GT, GTE,
        AND, OR, NOT,
        LPAREN, RPAREN, EOF
    }

    static class Token {
        TokenType type;
        String value;
        Token(TokenType type, String value) {
            this.type = type;
            this.value = value;
        }
    }

    private static class Tokenizer {
        private final String input;
        private int pos = 0;

        Tokenizer(String input) {
            this.input = input;
        }

        List<Token> tokenize() {
            List<Token> tokens = new ArrayList<>();
            while (pos < input.length()) {
                char ch = input.charAt(pos);
                if (Character.isWhitespace(ch)) {
                    pos++;
                } else if (Character.isLetter(ch) || ch == '_') {
                    tokens.add(new Token(TokenType.IDENTIFIER, readIdentifier()));
                } else if (Character.isDigit(ch) || ch == '.' || (ch == '-' && pos+1 < input.length() && Character.isDigit(input.charAt(pos+1)))) {
                    tokens.add(new Token(TokenType.NUMBER, readNumber()));
                } else if (ch == '"' || ch == '\'') {
                    tokens.add(new Token(TokenType.STRING, readString(ch)));
                } else if (ch == '=') {
                    if (pos + 1 < input.length() && input.charAt(pos + 1) == '=') {
                        tokens.add(new Token(TokenType.EQ_EQ, "=="));
                        pos += 2;
                    } else throw new ExpressionEvaluationException("Invalid char '='", "TOKENIZER", "PARSER");
                } else if (ch == '!') {
                    if (pos + 1 < input.length() && input.charAt(pos + 1) == '=') {
                        tokens.add(new Token(TokenType.NOT_EQ, "!="));
                        pos += 2;
                    } else {
                        tokens.add(new Token(TokenType.NOT, "!"));
                        pos++;
                    }
                } else if (ch == '<') {
                    if (pos + 1 < input.length() && input.charAt(pos + 1) == '=') {
                        tokens.add(new Token(TokenType.LTE, "<="));
                        pos += 2;
                    } else {
                        tokens.add(new Token(TokenType.LT, "<"));
                        pos++;
                    }
                } else if (ch == '>') {
                    if (pos + 1 < input.length() && input.charAt(pos + 1) == '=') {
                        tokens.add(new Token(TokenType.GTE, ">="));
                        pos += 2;
                    } else {
                        tokens.add(new Token(TokenType.GT, ">"));
                        pos++;
                    }
                } else if (ch == '&' && pos + 1 < input.length() && input.charAt(pos + 1) == '&') {
                    tokens.add(new Token(TokenType.AND, "&&"));
                    pos += 2;
                } else if (ch == '|' && pos + 1 < input.length() && input.charAt(pos + 1) == '|') {
                    tokens.add(new Token(TokenType.OR, "||"));
                    pos += 2;
                } else if (ch == '(') {
                    tokens.add(new Token(TokenType.LPAREN, "("));
                    pos++;
                } else if (ch == ')') {
                    tokens.add(new Token(TokenType.RPAREN, ")"));
                    pos++;
                } else {
                    throw new ExpressionEvaluationException("Unrecognized character: " + ch, "TOKENIZER", "PARSER");
                }
            }
            tokens.add(new Token(TokenType.EOF, "EOF"));
            return tokens;
        }

        private String readIdentifier() {
            int start = pos;
            while (pos < input.length() && (Character.isLetterOrDigit(input.charAt(pos)) || input.charAt(pos) == '_' || input.charAt(pos) == '-' || input.charAt(pos) == '.')) {
                pos++;
            }
            return input.substring(start, pos);
        }

        private String readNumber() {
            int start = pos;
            if (input.charAt(pos) == '-') pos++;
            while (pos < input.length() && (Character.isDigit(input.charAt(pos)) || input.charAt(pos) == '.')) {
                pos++;
            }
            return input.substring(start, pos);
        }

        private String readString(char quote) {
            pos++; // skip quote
            int start = pos;
            while (pos < input.length() && input.charAt(pos) != quote) {
                pos++;
            }
            if (pos >= input.length()) throw new ExpressionEvaluationException("Unterminated string", "TOKENIZER", "PARSER");
            String result = input.substring(start, pos);
            pos++; // skip closing quote
            return result;
        }
    }

    // ─── Parser ─────────────────────────────────────────
    private static class Parser {
        private final List<Token> tokens;
        private final Map<String, Object> fieldValues;
        private int pos = 0;

        Parser(List<Token> tokens, Map<String, Object> fieldValues) {
            this.tokens = tokens;
            this.fieldValues = fieldValues;
        }

        private Token current() {
            return tokens.get(pos);
        }

        private void consume(TokenType expected) {
            if (current().type == expected) pos++;
            else throw new ExpressionEvaluationException("Expected " + expected + " got " + current().type, "PARSER", "PARSER");
        }

        public Object parseExpression() {
            Object result = parseOr();
            if (current().type != TokenType.EOF) {
                throw new ExpressionEvaluationException("Unexpected token at end: " + current().value, "PARSER", "PARSER");
            }
            return result;
        }

        private Object parseOr() {
            Object left = parseAnd();
            while (current().type == TokenType.OR) {
                consume(TokenType.OR);
                Object right = parseAnd();
                left = isTruthy(left) || isTruthy(right);
            }
            return left;
        }

        private Object parseAnd() {
            Object left = parseNot();
            while (current().type == TokenType.AND) {
                consume(TokenType.AND);
                Object right = parseNot();
                left = isTruthy(left) && isTruthy(right);
            }
            return left;
        }

        private Object parseNot() {
            if (current().type == TokenType.NOT) {
                consume(TokenType.NOT);
                return !isTruthy(parseComparison());
            }
            return parseComparison();
        }

        private Object parseComparison() {
            Object left = parseOperand();
            TokenType op = current().type;
            if (op == TokenType.EQ_EQ || op == TokenType.NOT_EQ || op == TokenType.LT || op == TokenType.LTE || op == TokenType.GT || op == TokenType.GTE) {
                consume(op);
                Object right = parseOperand();
                return evaluateComparison(left, right, op);
            }
            return left;
        }

        private Object parseOperand() {
            Token t = current();
            if (t.type == TokenType.LPAREN) {
                consume(TokenType.LPAREN);
                Object expr = parseOr();
                consume(TokenType.RPAREN);
                return expr;
            } else if (t.type == TokenType.IDENTIFIER) {
                consume(TokenType.IDENTIFIER);
                // lookup value
                if (t.value.equals("true")) return true;
                if (t.value.equals("false")) return false;
                if (t.value.equals("null")) return null;
                return fieldValues.getOrDefault(t.value, "");
            } else if (t.type == TokenType.STRING) {
                consume(TokenType.STRING);
                return t.value;
            } else if (t.type == TokenType.NUMBER) {
                consume(TokenType.NUMBER);
                return Double.parseDouble(t.value);
            }
            throw new ExpressionEvaluationException("Unexpected operand: " + t.value, "PARSER", "PARSER");
        }

        private boolean evaluateComparison(Object left, Object right, TokenType op) {
            if (op == TokenType.EQ_EQ) {
                if (left == null && right == null) return true;
                if (left == null || right == null) return false;
                return left.toString().equals(right.toString());
            }
            if (op == TokenType.NOT_EQ) {
                if (left == null && right == null) return false;
                if (left == null || right == null) return true;
                return !left.toString().equals(right.toString());
            }
            
            double lNum = asDouble(left);
            double rNum = asDouble(right);

            return switch (op) {
                case LT -> lNum < rNum;
                case LTE -> lNum <= rNum;
                case GT -> lNum > rNum;
                case GTE -> lNum >= rNum;
                default -> false;
            };
        }

        private boolean isTruthy(Object val) {
            if (val == null) return false;
            if (val instanceof Boolean) return (Boolean) val;
            if (val instanceof String) return !((String) val).isEmpty();
            if (val instanceof Number) return ((Number) val).doubleValue() != 0;
            return true;
        }

        private double asDouble(Object val) {
            if (val == null) return 0.0;
            if (val instanceof Number) return ((Number) val).doubleValue();
            if (val instanceof String) {
                try {
                    if (((String) val).isBlank()) return 0.0;
                    return Double.parseDouble((String) val);
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            }
            return 0.0;
        }
    }
}
