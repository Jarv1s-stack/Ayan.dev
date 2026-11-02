const form = document.querySelector('#brief-form');
const size = document.querySelector('#project-size');
const sizeOutput = document.querySelector('#size-output');
const estimate = document.querySelector('#estimate-total');
const feedback = document.querySelector('#form-feedback');
const serviceInputs = [...document.querySelectorAll('input[name="service"]')];

function updateEstimate() {
  const selected = serviceInputs.filter(input => input.checked).reduce((sum, input) => sum + Number(input.dataset.price), 0);
  const views = Number(size.value);
  const low = Math.max(0, selected + views * 90);
  const high = Math.max(0, selected + views * 135);
  sizeOutput.value = `${views} ${views === 1 ? 'view' : 'views'}`;
  estimate.textContent = selected ? `$${low.toLocaleString()}–$${high.toLocaleString()}` : 'Choose a service';
}

serviceInputs.forEach(input => input.addEventListener('change', updateEstimate));
size.addEventListener('input', updateEstimate);

form.addEventListener('submit', event => {
  event.preventDefault();
  const services = serviceInputs.filter(input => input.checked).map(input => input.value);
  if (!services.length) {
    feedback.textContent = 'Choose at least one service to create a brief.';
    serviceInputs[0].focus();
    return;
  }
  const text = [
    'Mori Studio — project starting brief',
    `Services: ${services.join(', ')}`,
    `Key views: ${size.value}`,
    `Planning estimate: ${estimate.textContent}`,
    '',
    'The estimate is a conversation starter, not a quote.'
  ].join('\n');
  const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mori-project-brief.txt';
  link.click();
  URL.revokeObjectURL(url);
  feedback.textContent = 'Your brief is ready. The file was saved to your downloads.';
});

updateEstimate();
