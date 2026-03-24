document.addEventListener('DOMContentLoaded', () => {

  // GAME BOX HOVER
  document.querySelectorAll('.game-box').forEach(box => {
    box.addEventListener('mouseenter', () => {
      box.style.transform = 'scale(1.05)';
    });
    box.addEventListener('mouseleave', () => {
      box.style.transform = 'scale(1)';
    });
  });

  // SET BOX CLICK
  const setBoxes = document.querySelectorAll('.set-score-box');
  setBoxes.forEach(box => {
    box.addEventListener('click', () => {
      setBoxes.forEach(b => b.classList.remove('active'));
      box.classList.add('active');
    });
  });

  // STAT CARD HOVER
  document.querySelectorAll('.stat-mini-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.08)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
    });
  });

});

// MODALS
function showModal(id) {
  const modal = document.getElementById(id);
  modal.style.display = 'flex';
}

function hideModal(id) {
  const modal = document.getElementById(id);
  modal.style.display = 'none';
}

// CLICK OUTSIDE CLOSE
document.querySelectorAll('.custom-modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// ESC CLOSE
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.custom-modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }
});