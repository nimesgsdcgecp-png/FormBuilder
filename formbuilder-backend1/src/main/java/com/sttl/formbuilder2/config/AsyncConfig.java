package com.sttl.formbuilder2.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * AsyncConfig — Enables asynchronous processing in the Spring context.
 *
 * This allows methods marked with @Async (like RuleEngineService.sendRealEmail)
 * to be executed in a separate thread pool, preventing long-running tasks
 * (like SMTP delivery) from blocking the main request thread.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
