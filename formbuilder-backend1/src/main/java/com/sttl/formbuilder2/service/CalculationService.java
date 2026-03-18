package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.model.entity.FormField;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * CalculationService — Handles server-side expression evaluation for calculated fields.
 */
@Service
@RequiredArgsConstructor
public class CalculationService {

    public void recalculateCalculatedFields(Map<String, Object> data, List<FormField> activeFields) {
        for (FormField field : activeFields) {
            String formula = field.getCalculationFormula();
            if (formula != null && !formula.isBlank()) {
                try {
                    String result = evaluateFormula(formula, data);
                    data.put(field.getColumnName(), result);
                } catch (Exception e) {
                    data.put(field.getColumnName(), "Error: " + e.getMessage());
                }
            }
        }
    }

    private String evaluateFormula(String formula, Map<String, Object> data) {
        String processed = formula;
        Pattern p = Pattern.compile("\\{\\{(.+?)\\}\\}");
        Matcher m = p.matcher(formula);
        while (m.find()) {
            String colName = m.group(1).trim();
            Object val = data.get(colName);
            processed = processed.replace(m.group(0), val == null ? "0" : val.toString());
        }

        try {
            double res = SimpleMathEvaluator.eval(processed);
            if (res == (long) res) {
                return String.format("%d", (long) res);
            } else {
                return String.format("%.2f", res);
            }
        } catch (Exception e) {
            return "0";
        }
    }

    /**
     * Inner Utility for basic math evaluation.
     */
    private static class SimpleMathEvaluator {
        public static double eval(final String str) {
            return new Object() {
                int pos = -1, ch;

                void nextChar() {
                    ch = (++pos < str.length()) ? str.charAt(pos) : -1;
                }

                boolean eat(int charToEat) {
                    while (ch == ' ') nextChar();
                    if (ch == charToEat) {
                        nextChar();
                        return true;
                    }
                    return false;
                }

                double parse() {
                    nextChar();
                    double x = parseExpression();
                    if (pos < str.length()) throw new RuntimeException("Unexpected: " + (char) ch);
                    return x;
                }

                double parseExpression() {
                    double x = parseTerm();
                    for (;;) {
                        if (eat('+')) x += parseTerm();
                        else if (eat('-')) x -= parseTerm();
                        else return x;
                    }
                }

                double parseTerm() {
                    double x = parseFactor();
                    for (;;) {
                        if (eat('*')) x *= parseFactor();
                        else if (eat('/')) x /= parseFactor();
                        else return x;
                    }
                }

                double parseFactor() {
                    if (eat('+')) return parseFactor();
                    if (eat('-')) return -parseFactor();

                    double x;
                    int startPos = this.pos;
                    if (eat('(')) {
                        x = parseExpression();
                        eat(')');
                    } else if ((ch >= '0' && ch <= '9') || ch == '.') {
                        while ((ch >= '0' && ch <= '9') || ch == '.') nextChar();
                        x = Double.parseDouble(str.substring(startPos, this.pos));
                    } else if (ch >= 'a' && ch <= 'z') {
                        while (ch >= 'a' && ch <= 'z') nextChar();
                        String func = str.substring(startPos, this.pos);
                        x = parseFactor();
                        if (func.equals("sqrt")) x = Math.sqrt(x);
                        else if (func.equals("sin")) x = Math.sin(Math.toRadians(x));
                        else if (func.equals("cos")) x = Math.cos(Math.toRadians(x));
                        else if (func.equals("tan")) x = Math.tan(Math.toRadians(x));
                        else throw new RuntimeException("Unknown function: " + func);
                    } else {
                        throw new RuntimeException("Unexpected: " + (char) ch);
                    }

                    if (eat('^')) x = Math.pow(x, parseFactor());

                    return x;
                }
            }.parse();
        }
    }
}
