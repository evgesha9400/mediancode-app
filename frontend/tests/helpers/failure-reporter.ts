/**
 * Custom Playwright reporter that prints viewing instructions when tests fail.
 *
 * Outputs:
 * - Paths to failure screenshots and videos
 * - Command to open the interactive HTML report
 */

import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class FailureReporter implements Reporter {
	private failures: { title: string; attachments: { name: string; path?: string }[] }[] = [];

	onTestEnd(test: TestCase, result: TestResult) {
		if (result.status === 'failed' || result.status === 'timedOut') {
			this.failures.push({
				title: test.title,
				attachments: result.attachments
					.filter((a) => a.path)
					.map((a) => ({ name: a.name, path: a.path }))
			});
		}
	}

	onEnd(result: FullResult) {
		if (this.failures.length === 0) return;

		const divider = '─'.repeat(70);
		console.log(`\n${divider}`);
		console.log('  FAILED TEST ARTIFACTS');
		console.log(divider);

		for (const failure of this.failures) {
			console.log(`\n  ${failure.title}`);
			for (const attachment of failure.attachments) {
				console.log(`    ${attachment.name}: ${attachment.path}`);
			}
		}

		console.log(`\n${divider}`);
		console.log('  View full report with screenshots, videos & traces:');
		console.log('  bunx playwright show-report');
		console.log(divider + '\n');
	}
}
