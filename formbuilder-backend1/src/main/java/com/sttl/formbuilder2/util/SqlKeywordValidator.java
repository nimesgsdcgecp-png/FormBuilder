package com.sttl.formbuilder2.util;

import java.util.Set;

public class SqlKeywordValidator {

    private static final Set<String> RESERVED_KEYWORDS = Set.of(
        "SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL",
        "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "OFFSET", "UNION", "DISTINCT",
        "TABLE", "COLUMN", "INDEX", "PRIMARY", "FOREIGN", "KEY", "CONSTRAINT", "REFERENCES",
        "VIEW", "SEQUENCE", "TRIGGER", "USER", "ROLE", "GRANT", "REVOKE"
    );

    public static boolean isReserved(String word) {
        if (word == null) return false;
        return RESERVED_KEYWORDS.contains(word.toUpperCase());
    }

    public static void validate(String word) {
        if (isReserved(word)) {
            throw new com.sttl.formbuilder2.exception.FormBuilderException("SQL_RESERVED_KEYWORD", 
                "Field key '" + word + "' is a reserved SQL keyword");
        }
    }
}
