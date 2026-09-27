const input = document.querySelector('#resume-file');
const dropZone = document.querySelector('#drop-zone');
const prompt = document.querySelector('#upload-help');
const selectedFile = document.querySelector('#selected-file');
const fileName = document.querySelector('#file-name');
const fileDetail = document.querySelector('#file-detail');
const fileError = document.querySelector('#file-error');
const fileStatus = document.querySelector('#file-status');
const removeButton = document.querySelector('#remove-file');
const dialog = document.querySelector('#result-dialog');
const maxFileSize = 10 * 1024 * 1024;
let resume = null;
let dragDepth = 0;

function showError(message) {
  fileError.textContent = message;
  input.setAttribute('aria-invalid', 'true');
}

function clearError() {
  fileError.textContent = '';
  input.removeAttribute('aria-invalid');
}

function selectFiles(files) {
  clearError();
  if (!files.length) return;
  if (files.length !== 1) {
    showError('Please choose one resume at a time.');
    return;
  }

  const file = files[0];
  if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
    showError('Please choose a PDF, DOC, or DOCX file.');
    return;
  }
  if (file.size === 0) {
    showError('This file is empty. Please choose another file.');
    return;
  }
  if (file.size > maxFileSize) {
    showError('Your file is too large. The limit is 10 MB.');
    return;
  }

  resume = file;
  // File names are user input: render them as text, never as HTML.
  fileName.textContent = file.name;
  const size = file.size >= 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  fileDetail.textContent = `${size} · Ready to finish`;
  prompt.hidden = true;
  selectedFile.hidden = false;
  removeButton.hidden = false;
  fileStatus.textContent = `${file.name} selected. ${size}.`;
}

input.addEventListener('change', () => {
  selectFiles(Array.from(input.files));
  // Allow the same file to be selected again after a removal or validation error.
  input.value = '';
});

dropZone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth += 1;
  dropZone.classList.add('is-dragging');
});
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});
dropZone.addEventListener('dragleave', (event) => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropZone.classList.remove('is-dragging');
});
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove('is-dragging');
  const files = Array.from(event.dataTransfer.files);
  if (files.length) selectFiles(files);
  else showError('Please drop a PDF, DOC, or DOCX file.');
});
// A misplaced file must not navigate away from the page.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

removeButton.addEventListener('click', () => {
  resume = null;
  input.value = '';
  selectedFile.hidden = true;
  prompt.hidden = false;
  removeButton.hidden = true;
  clearError();
  fileStatus.textContent = 'Resume removed. Choose another file or finish without a resume.';
  input.focus();
});

function showDialog(title, description) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = description;
  dialog.showModal();
}

document.querySelector('#resume-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (fileError.textContent) {
    input.focus();
    return;
  }
  showDialog(
    resume ? 'Your resume is ready!' : 'You’re all set!',
    resume
      ? `${resume.name} has been selected. This is a front-end demo; your file stays on your device and is not sent to a server.`
      : 'You finished without a resume. You can close this message and add one at any time. This is a front-end demo.',
  );
});

document.querySelector('#last-step').addEventListener('click', () => {
  showDialog('Previous step', 'This exercise includes the final resume step only. Your selected file is kept while you return to this screen.');
});

dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
    dialog.close();
  }
});
