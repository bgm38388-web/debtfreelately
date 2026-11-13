export function initWelcomeDemo() {
  const teaser = document.createElement('section');
  teaser.className = 'welcome-demo';
  teaser.setAttribute('aria-labelledby', 'welcome-demo-title');
  teaser.innerHTML = `
    <p class="welcome-demo-label"><span aria-hidden="true">✦</span> TRY IT YOURSELF</p>
    <h3 id="welcome-demo-title">Create a Sample Debt Card</h3>
    <p>Try it out, preview your card, and see exactly what you can choose to share or keep private.</p>
    <a href="/demo-card-preview" class="welcome-demo-button welcome-demo-launch">
      Try a Demo →
      <svg class="welcome-demo-dashes" aria-hidden="true" focusable="false">
        <rect pathLength="100" />
      </svg>
    </a>
    <small>No sign-up required. No real information needed.</small>`;
  document.querySelector('#welcome .welcome-panel').after(teaser);
}
