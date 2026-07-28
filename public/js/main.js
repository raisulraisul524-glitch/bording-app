document.getElementById('year').textContent = new Date().getFullYear();

// Scroll-reveal animation
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => io.observe(el));

// Booking application form
const form = document.getElementById('applyForm');
const status = document.getElementById('formStatus');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (status) {
    status.textContent = 'Submitting...';
    status.className = 'form-status';
  }

  const payload = {
    full_name: document.getElementById('full_name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    message: document.getElementById('message').value.trim(),
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    status.textContent = 'Application received. We will contact you soon, insha\'Allah.';
    status.className = 'form-status ok';
    form.reset();
  } catch (err) {
    status.textContent = err.message;
    status.className = 'form-status err';
  }
});
