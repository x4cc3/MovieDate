// Logic for Multi-Step Form, Validation, Acceptance, and Enhanced Features

let threeBg = {
    transitionToStep: () => { },
    toggleMotion: () => { },
    onLoadComplete: null
};

// Storage key for form persistence
const STORAGE_KEY = 'cosmicInviteFormData';

// Try to load 3D background
(async () => {
    try {
        const module = await import('./three-bg.js');
        threeBg = module.threeBg;
        threeBg.transitionToStep(1);
        // Hide loading overlay when ready
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, 500);
        }
    } catch (e) {
        // Silently fail - hide loader anyway
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
})();

const steps = document.querySelectorAll('.step');
const totalSteps = steps.length;
let currentStep = 1;

// --- LocalStorage Persistence ---

function saveFormData() {
    const data = {
        currentStep,
        genre: genreSelect.value,
        genreOther: genreOther.value,
        snacks: document.getElementById('snacks').value,
        dates: Array.from(document.querySelectorAll('.date-input')).map(i => i.value),
        time: timeInput.value,
        notes: document.getElementById('extra-notes').value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restoreFormData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        // Restore genre
        if (data.genre) {
            genreSelect.value = data.genre;
            if (data.genre === 'Other' && data.genreOther) {
                genreOther.classList.remove('hidden');
                genreOther.value = data.genreOther;
            }
        }

        // Restore snacks
        if (data.snacks) document.getElementById('snacks').value = data.snacks;

        // Restore dates
        if (data.dates && data.dates.length > 0) {
            const dateInputs = document.querySelectorAll('.date-input');
            data.dates.forEach((dateVal, index) => {
                if (index === 0 && dateInputs[0]) {
                    dateInputs[0].value = dateVal;
                } else if (dateVal) {
                    // Add new date row
                    const div = document.createElement('div');
                    div.className = 'date-row';
                    div.innerHTML = `
                        <input type="date" class="input-control date-input" required value="${dateVal}">
                        <button type="button" class="btn-icon remove-date" aria-label="Remove date">&times;</button>
                    `;
                    dateContainer.appendChild(div);
                }
            });
        }

        // Restore time
        if (data.time) {
            timeInput.value = data.time;
            // Highlight matching chip
            document.querySelectorAll('.chip').forEach(chip => {
                if (chip.dataset.time === data.time) {
                    chip.classList.add('selected');
                }
            });
        }

        // Restore notes
        if (data.notes) document.getElementById('extra-notes').value = data.notes;

        // Navigate to saved step
        if (data.currentStep && data.currentStep > 1) {
            changeStep(data.currentStep);
        }
    } catch (e) {
        // Invalid data, ignore
    }
}

function clearFormData() {
    localStorage.removeItem(STORAGE_KEY);
}

// --- Navigation & Inputs ---

const genreSelect = document.getElementById('genre-select');
const genreOther = document.getElementById('genre-other');

genreSelect.addEventListener('change', (e) => {
    if (e.target.value === 'Other') {
        genreOther.classList.remove('hidden');
        genreOther.focus();
    } else {
        genreOther.classList.add('hidden');
        genreOther.value = "";
    }
    saveFormData();
});

genreOther.addEventListener('input', saveFormData);

const dateContainer = document.getElementById('date-container');
const addDateBtn = document.getElementById('add-date-btn');

addDateBtn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'date-row';
    div.innerHTML = `
        <input type="date" class="input-control date-input" required>
        <button type="button" class="btn-icon remove-date" aria-label="Remove date">&times;</button>
    `;
    dateContainer.appendChild(div);
    // Add save listener to new input
    div.querySelector('.date-input').addEventListener('change', saveFormData);
});

dateContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-date')) {
        e.target.closest('.date-row').remove();
        saveFormData();
    }
});

// Save on existing date inputs
document.querySelectorAll('.date-input').forEach(input => {
    input.addEventListener('change', saveFormData);
});

const timeInput = document.getElementById('time-input');
timeInput.addEventListener('change', saveFormData);

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        timeInput.value = chip.dataset.time;
        saveFormData();
    });
    // Keyboard support
    chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            chip.click();
        }
    });
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('role', 'button');
});

// Save notes on input
document.getElementById('extra-notes').addEventListener('input', saveFormData);
document.getElementById('snacks').addEventListener('input', saveFormData);

document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (validateStep(currentStep)) changeStep(currentStep + 1);
    });
});
document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => changeStep(currentStep - 1));
});

function changeStep(stepIndex) {
    if (stepIndex < 1 || stepIndex > totalSteps) return;
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${stepIndex}"]`).classList.add('active');
    currentStep = stepIndex;

    // Update progress bar
    const progress = (stepIndex / totalSteps) * 100;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }

    // Update step indicator
    const stepIndicator = document.getElementById('step-indicator');
    if (stepIndicator) {
        stepIndicator.textContent = `STEP ${stepIndex} / ${totalSteps}`;
        // Announce to screen readers
        stepIndicator.setAttribute('aria-label', `Step ${stepIndex} of ${totalSteps}`);
    }

    // Focus management for accessibility
    const activeStep = document.querySelector(`.step[data-step="${stepIndex}"]`);
    const firstInput = activeStep.querySelector('input, select, textarea, button');
    if (firstInput) firstInput.focus();

    threeBg.transitionToStep(currentStep);
    saveFormData();
}

function validateStep(step) {
    const stepEl = document.querySelector(`.step[data-step="${step}"]`);
    let valid = true;
    stepEl.querySelectorAll('[required]').forEach(el => {
        if (!el.value) {
            el.classList.add('input-error');
            el.setAttribute('aria-invalid', 'true');
            el.setAttribute('aria-describedby', 'error-msg');
            valid = false;
        } else {
            el.classList.remove('input-error');
            el.removeAttribute('aria-invalid');
            el.removeAttribute('aria-describedby');
        }
    });

    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
        if (!valid) {
            errorBanner.classList.remove('hidden');
        } else {
            errorBanner.classList.add('hidden');
        }
    }
    return valid;
}

// --- Confetti Animation ---

function createConfetti() {
    const colors = ['#c77dff', '#5ae4ff', '#ff5e7b', '#5af7c2', '#ffcc00'];
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    confettiContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confettiContainer.appendChild(confetti);
    }

    // Remove after animation
    setTimeout(() => {
        confettiContainer.remove();
    }, 5000);
}

// --- Calendar Integration ---

function generateGoogleCalendarUrl(genre, time, dates, snacks) {
    const title = encodeURIComponent(`Movie Night - ${genre}`);
    const description = encodeURIComponent(`Genre: ${genre}\nSnacks: ${snacks}\n\nLet's watch something awesome together! 🎬`);

    // Use first date
    const dateStr = dates.split(',')[0].trim();
    if (!dateStr) return null;

    // Parse date and time
    const eventDate = new Date(dateStr);
    const [hours, minutes] = time.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);

    // End time (2 hours later)
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

    // Format for Google Calendar (YYYYMMDDTHHmmss)
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const startStr = formatDate(eventDate);
    const endStr = formatDate(endDate);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${description}`;
}

// --- Ticket Download ---

async function downloadTicket() {
    const ticket = document.querySelector('.ticket');
    if (!ticket) return;

    try {
        // Use html2canvas if available, otherwise create simple text
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(ticket, {
                backgroundColor: '#0c0419',
                scale: 2
            });
            const link = document.createElement('a');
            link.download = 'movie-night-ticket.png';
            link.href = canvas.toDataURL();
            link.click();
        } else {
            // Fallback: Copy as text
            const genre = document.getElementById('ticket-genre').innerText;
            const time = document.getElementById('ticket-time').innerText;
            const dates = document.getElementById('ticket-dates').innerText;
            const snacks = document.getElementById('ticket-snacks').innerText;
            const id = document.getElementById('ticket-id-val').innerText;

            const text = `🎬 MOVIE NIGHT TICKET 🎬\n${'─'.repeat(30)}\nID: ${id}\nGenre: ${genre}\nTime: ${time}\nDates: ${dates}\nSnacks: ${snacks}\n${'─'.repeat(30)}\n✓ ACCEPTED`;

            // Create downloadable text file
            const blob = new Blob([text], { type: 'text/plain' });
            const link = document.createElement('a');
            link.download = 'movie-night-ticket.txt';
            link.href = URL.createObjectURL(blob);
            link.click();
        }
    } catch (e) {
        // Silent failure
    }
}

// --- Review & Acceptance ---

const btnReview = document.getElementById('btn-review');
const modalOverlay = document.getElementById('modal-overlay');
const btnAccept = document.getElementById('btn-accept');
const reviewSummary = document.getElementById('review-summary');
const acceptanceCard = document.getElementById('acceptance-card');
const wizardContainer = document.getElementById('wizard-container');

btnReview.addEventListener('click', () => {
    // Gather data
    const genre = genreSelect.value === 'Other' ? genreOther.value : genreSelect.value;
    const snacks = document.getElementById('snacks').value || "None";
    const dates = Array.from(document.querySelectorAll('.date-input')).map(i => i.value).filter(Boolean).join(', ');
    const time = timeInput.value;
    const notes = document.getElementById('extra-notes').value || "No notes";

    const html = `
        <div class="review-item"><span class="review-label">Genre</span> ${genre}</div>
        <div class="review-item"><span class="review-label">Snacks</span> ${snacks}</div>
        <div class="review-item"><span class="review-label">Dates</span> ${dates || 'None'}</div>
        <div class="review-item"><span class="review-label">Time</span> ${time}</div>
        <div class="review-item"><span class="review-label">Notes</span> ${notes}</div>
    `;

    reviewSummary.innerHTML = html;
    modalOverlay.classList.remove('hidden');
});

document.getElementById('btn-edit').addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

btnAccept.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    wizardContainer.style.display = 'none';
    threeBg.transitionToStep('accepted'); // Zoom in effect

    // Populate Ticket
    const genre = genreSelect.value === 'Other' ? genreOther.value : genreSelect.value;
    const snacks = document.getElementById('snacks').value || "None";
    const dates = Array.from(document.querySelectorAll('.date-input')).map(i => i.value).filter(Boolean).join(', ');
    const time = timeInput.value;

    document.getElementById('ticket-genre').innerText = genre;
    document.getElementById('ticket-snacks').innerText = snacks;
    document.getElementById('ticket-dates').innerText = dates || "TBD";
    document.getElementById('ticket-time').innerText = time;
    document.getElementById('ticket-id-val').innerText = Math.floor(100000 + Math.random() * 900000);

    // Set up calendar link
    const calendarUrl = generateGoogleCalendarUrl(genre, time, dates, snacks);
    const calendarBtn = document.getElementById('btn-calendar');
    if (calendarBtn && calendarUrl) {
        calendarBtn.onclick = () => window.open(calendarUrl, '_blank');
    }

    acceptanceCard.classList.remove('hidden');

    // Trigger confetti!
    createConfetti();

    // Clear saved form data on acceptance
    clearFormData();
});

// --- Acceptance Card Actions ---

document.getElementById('btn-copy').addEventListener('click', (e) => {
    const genre = document.getElementById('ticket-genre').innerText;
    const time = document.getElementById('ticket-time').innerText;
    const dates = document.getElementById('ticket-dates').innerText;
    const snacks = document.getElementById('ticket-snacks').innerText;
    const id = document.getElementById('ticket-id-val').innerText;

    const text = `MOVIE NIGHT TICKET\n------------------\nID: ${id}\nGenre: ${genre}\nTime: ${time}\nDates: ${dates}\nSnacks: ${snacks}\n------------------\nACCEPTED`;

    navigator.clipboard.writeText(text);

    // Visual feedback
    const original = e.target.innerHTML;
    e.target.innerHTML = "Copied";
    setTimeout(() => e.target.innerHTML = original, 2000);
});

// Download button
document.getElementById('btn-download')?.addEventListener('click', downloadTicket);

document.getElementById('btn-clean-view').addEventListener('click', () => {
    document.body.classList.add('clean-view');
});

// Restore view on click
document.addEventListener('click', (e) => {
    if (document.body.classList.contains('clean-view') && !e.target.closest('.btn-ticket-action')) {
        document.body.classList.remove('clean-view');
    }
});

document.getElementById('btn-reset').addEventListener('click', () => {
    clearFormData();
    window.location.reload();
});

// --- Intro Logic with External JSON ---

let pickupLines = [
    "If I could rearrange the stars, I'd put your smile next to mine.",
    "Are you a magician? Because whenever I look at you, everyone else disappears."
];

// Load pickup lines from JSON
(async () => {
    try {
        const response = await fetch('./pickup-lines.json');
        if (response.ok) {
            pickupLines = await response.json();
        }
    } catch (e) {
        // Use default lines
    }
})();

const pickupEl = document.getElementById('pickup-line');
let usedLines = new Set();

function setRandomLine() {
    if (!pickupEl) return;
    // reset when all are used
    if (usedLines.size === pickupLines.length) {
        usedLines = new Set();
    }
    let line;
    do {
        line = pickupLines[Math.floor(Math.random() * pickupLines.length)];
    } while (usedLines.has(line));
    usedLines.add(line);
    pickupEl.textContent = line;
}

// Set initial line after JSON loads
setTimeout(() => {
    if (pickupEl) setRandomLine();
}, 300);

// Initialize progress
const progressBar = document.getElementById('progress-bar');
if (progressBar) {
    progressBar.style.width = `${(1 / totalSteps) * 100}%`;
}

// Restore saved form data on load
restoreFormData();

// --- Skip Link Handler ---
document.getElementById('skip-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('wizard-container');
    if (main) {
        main.focus();
        main.scrollIntoView({ behavior: 'smooth' });
    }
});
