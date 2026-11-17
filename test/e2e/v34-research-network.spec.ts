import { expect, test } from '@playwright/test';

/**
 * ResearchWithME v3.4 Wave 4 End-to-End Playwright User Journeys.
 *
 * Exercises every core Knowledge Network, Workspace, Peer Review, Provenance
 * Graph, Global Tool Registry, and Personal Research OS workflow against the
 * live Next.js App Router runtime.
 */

test.describe('v3.4 Knowledge Network & Peer Review / Discussion separation', () => {
  test('feed -> contribution detail -> anonymous peer review vs separate lockable informal discussion', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/feed', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Research Contributions Feed' })).toBeVisible();
    await page.goto('/contribution/contrib-rl-cold-start', { waitUntil: 'networkidle' });

    // Formal Peer Review section redacts anonymous reviewer identities (§6)
    const reviewRegion = page.getByRole('region', { name: 'Formal Peer Review' });
    await expect(reviewRegion).toBeVisible();
    await expect(reviewRegion).toContainText('Anonymous reviewer');
    await expect(reviewRegion).not.toContainText('dr-lin-eval');
    await expect(reviewRegion).not.toContainText('user-reviewer-1');

    // Informal Scholarly Discussion sits strictly separate below Peer Review (§6)
    const discussionRegion = page.getByRole('region', { name: 'Informal Scholarly Discussion' });
    await expect(discussionRegion).toBeVisible();
    await expect(discussionRegion).toContainText(
      'Informal Discussion · Separate from Formal Peer Review',
    );

    // Start a new informal discussion thread & lock it
    await discussionRegion.getByRole('button', { name: /Start discussion thread/i }).click();
    await discussionRegion.getByLabel('Thread title').fill('Playwright INT4 Quantization Check');
    await discussionRegion
      .getByLabel(/Opening comment/i)
      .fill('Checking informal replication variance on consumer GPUs.');
    await discussionRegion.getByRole('button', { name: 'Create discussion thread' }).click();

    await expect(discussionRegion).toContainText('Playwright INT4 Quantization Check');
    await discussionRegion.getByRole('button', { name: 'Lock thread' }).first().click();
    await expect(discussionRegion).toContainText('Locked');
  });
});

test.describe('v3.4 Workspaces, Projects & Private ProjectNote', () => {
  test('workspaces overview -> project workspace -> milestone + private working note', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/workspaces', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /Research Workspaces/i })).toBeVisible();
    await page.goto('/workspaces/reasoning-cold-start-replication', { waitUntil: 'networkidle' });

    await expect(page.getByText('Project Working Notes')).toBeVisible();
    await page.getByPlaceholder('Working note title...').fill('E2E Seed Matrix');
    await page
      .getByPlaceholder(/Experiment scratch notes/i)
      .fill('Private workspace note: seeds 101-103 queued.');
    await page.getByRole('button', { name: 'Save working note' }).click();

    await expect(page.getByText('E2E Seed Matrix')).toBeVisible();
  });
});

test.describe('v3.4 Provenance Graph human curation', () => {
  test('renders accessible default list/table view and curates AI-proposed edge', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/graph', { waitUntil: 'networkidle' });

    await expect(page.locator('main ul').first()).toBeVisible();
    await expect(page.locator('main table').first()).toBeVisible();
    await expect(page.getByText('Pending Human Curation')).toBeVisible();

    const acceptBtn = page.getByRole('button', { name: /Accept edge/i }).first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();
    await expect(page.getByRole('status')).toContainText(/accepted|updated/i);
  });
});

test.describe('v3.4 Global Open-Source Tool Registry', () => {
  test('displays timestamped repository observations separate from linked citable software sources', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tools', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Research Tool Repositories' })).toBeVisible();
    await expect(page.getByText('Repository metrics observed on').first()).toBeVisible();
    await expect(page.getByText('Linked Citable Sources').first()).toBeVisible();

    await page.getByPlaceholder(/Search repositories/i).fill('vLLM');
    await expect(page.getByRole('link', { name: /^vLLM/i }).first()).toBeVisible();
  });
});

test.describe('v3.4 Personal Research OS Hub', () => {
  test('keeps Attention, Notifications, Assistant Promotion, Recognition, and Preferences cleanly separated', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/research-os', { waitUntil: 'networkidle' });

    const attentionRegion = page.getByRole('region', { name: 'Attention Queue' });
    const notifRegion = page.getByRole('region', { name: 'Notifications Event History' });
    const assistantRegion = page.getByRole('region', { name: 'Optional Assistant Tasks' });
    const recognitionRegion = page.getByRole('region', { name: 'Scholarly Recognition Summary' });

    await expect(attentionRegion).toBeVisible();
    await expect(notifRegion).toBeVisible();
    await expect(assistantRegion).toBeVisible();
    await expect(recognitionRegion).toBeVisible();

    // No composite reputation/trust scores (§11)
    await expect(recognitionRegion).toContainText('No opaque composite reputation score');
    await expect(recognitionRegion).not.toContainText('Reputation Score:');

    // Mark notification read without affecting Attention Queue count (§10)
    const initialAttentionHeading = await attentionRegion.getByText(/Attention Queue \(\d+ active\)/).textContent();
    const markRead = notifRegion.getByRole('button', { name: 'Mark read' }).first();
    if (await markRead.isVisible()) {
      await markRead.click();
      await expect(attentionRegion.getByText(/Attention Queue \(\d+ active\)/)).toHaveText(
        initialAttentionHeading ?? '',
      );
    }

    // Explicitly promote optional Assistant Task to Attention Queue (§10)
    const promoteBtn = assistantRegion
      .getByRole('button', { name: 'Promote to Attention Queue' })
      .first();
    if (await promoteBtn.isVisible()) {
      await promoteBtn.click();
      await expect(page.getByRole('status')).toContainText(/promoted to your Attention Queue/i);
    }

    // Update default landing preference (§13)
    const prefsRegion = page.getByRole('region', { name: 'Personal Research OS Preferences' });
    await prefsRegion.getByRole('button', { name: 'PROJECTS', exact: true }).click();
    await expect(prefsRegion.getByRole('button', { name: 'PROJECTS', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
