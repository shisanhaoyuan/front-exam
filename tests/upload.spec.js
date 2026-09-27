import { test, expect } from '@playwright/test';

const pdf = { name: 'My resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDemo resume') };

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('matches the responsive layout without horizontal overflow', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: 'Finish! Upload Your Resume' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upload file' })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveText('3');
  const intro = await page.locator('.introduction').boundingBox();
  const card = await page.locator('.upload-card').boundingBox();
  if (testInfo.project.name === 'mobile') expect(card.y).toBeGreaterThan(intro.y + intro.height);
  else expect(card.x).toBeGreaterThan(intro.x + intro.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('click opens file picker, displays filename, and removes it', async ({ page }) => {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('#drop-zone').click();
  await (await chooser).setFiles(pdf);
  await expect(page.locator('#file-name')).toHaveText(pdf.name);
  await expect(page.getByRole('status')).toContainText('selected');
  await page.getByRole('button', { name: 'Remove file' }).click();
  await expect(page.locator('#selected-file')).toBeHidden();
  await expect(page.locator('#upload-help')).toBeVisible();
  await page.locator('#resume-file').setInputFiles(pdf);
  await expect(page.locator('#file-name')).toHaveText(pdf.name);
});

test('accepts a dragged file and clears the drag state', async ({ page }) => {
  await page.locator('#drop-zone').evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['resume content'], 'Dragged resume.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    element.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: transfer }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(page.locator('#file-name')).toHaveText('Dragged resume.docx');
  await expect(page.locator('#drop-zone')).not.toHaveClass(/is-dragging/);
});

test('rejects unsupported and empty files, then recovers', async ({ page }) => {
  await page.locator('#resume-file').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('not a resume') });
  await expect(page.getByRole('alert')).toHaveText('Please choose a PDF, DOC, or DOCX file.');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('#resume-file').setInputFiles({ ...pdf, buffer: Buffer.alloc(0) });
  await expect(page.getByRole('alert')).toContainText('empty');
  await page.locator('#resume-file').setInputFiles(pdf);
  await expect(page.getByRole('alert')).toBeEmpty();
});

test('rejects oversized files without losing a valid selection', async ({ page }) => {
  await page.locator('#resume-file').setInputFiles(pdf);
  await page.locator('#resume-file').setInputFiles({ ...pdf, name: 'Large.pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 'x') });
  await expect(page.getByRole('alert')).toContainText('10 MB');
  await expect(page.locator('#file-name')).toHaveText(pdf.name);
  await page.getByRole('button', { name: 'Remove file' }).click();
  await expect(page.getByRole('alert')).toBeEmpty();
});

test('rejects multiple dropped files', async ({ page }) => {
  await page.locator('#drop-zone').evaluate((element) => {
    const transfer = new DataTransfer();
    for (const name of ['one.pdf', 'two.pdf']) transfer.items.add(new File(['resume'], name, { type: 'application/pdf' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(page.getByRole('alert')).toContainText('one resume at a time');
});

test('finish supports skipping or selecting, without sending the file', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') externalRequests.push(request.url());
  });
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('You finished without a resume');
  await page.getByRole('button', { name: 'Back to resume' }).click();
  await page.locator('#resume-file').setInputFiles(pdf);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('My resume.pdf');
  await expect(page.getByRole('dialog')).toContainText('not sent to a server');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('previous-step feedback preserves the selected resume', async ({ page }) => {
  await page.locator('#resume-file').setInputFiles(pdf);
  await page.getByRole('button', { name: 'Last step' }).click();
  await expect(page.getByRole('dialog')).toContainText('final resume step only');
  await page.getByRole('button', { name: 'Back to resume' }).click();
  await expect(page.locator('#file-name')).toHaveText(pdf.name);
});

test('supports keyboard selection and has no runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.locator('#resume-file')).toBeFocused();
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await chooser).setFiles(pdf);
  await expect(page.locator('#file-name')).toHaveText(pdf.name);
  expect(errors).toEqual([]);
});
