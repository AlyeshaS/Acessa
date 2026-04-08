// --- WCAG Code Suggestions lookup ---
// Generic fixes that apply to any website — keyed by criterion number (e.g. "2.4.4")
// Each entry: effort, where, before (broken), after tabs (html/css/js/react), testSteps, links
const WCAG_CODE_SUGGESTIONS = {
  // Fallback for any missing WCAG criterion
  _default: {
    effort: { label: "General guidance", time: "Varies", color: "#64748b" },

    where: "Apply appropriate semantic HTML and labeling",

    before: `<!-- No specific example available -->
<!-- Review WCAG documentation for guidance -->`,

    html: `<!-- Generic accessible example -->
<label for="input">Label</label>
<input id="input" />`,

    css: `/* Ensure focus visibility */
:focus {
  outline: 2px solid #000;
}`,

    react: `// Accessible React input example
<label htmlFor="input">Label</label>
<input id="input" />`,

    js: `// Ensure interactive elements are keyboard accessible
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // trigger action
  }
});`,

    testSteps: [
      "Review the official WCAG documentation for this criterion.",
      "Check that elements are labeled and accessible.",
      "Test using keyboard navigation.",
      "Run accessibility tools like axe or Lighthouse.",
    ],

    links: [
      {
        label: "WCAG Overview",
        url: "https://www.w3.org/WAI/standards-guidelines/wcag/",
      },
    ],
  },
  "1.1.1": {
    effort: { label: "Quick fix", time: "~10 min", color: "#16a34a" },
    where:
      "Find every <img>, <svg>, and <canvas> element in your HTML/templates.",
    before: `<!-- ❌ Missing alt — screen reader says "image" or the filename -->
<img src="hero-banner.jpg" />
<img src="chart-q3.png" />

<!-- ❌ SVG with no label — announced as nothing -->
<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>`,
    html: `<!-- ✅ Meaningful images get a descriptive alt -->
<img src="hero-banner.jpg"
     alt="Team of developers collaborating around a laptop" />

<!-- ✅ Data visualisations describe the key insight -->
<img src="chart-q3.png"
     alt="Bar chart: Q3 sales up 20% vs Q2, reaching $1.2M" />

<!-- ✅ Decorative images get an empty alt — AT skips them -->
<img src="divider-wave.svg" alt="" role="presentation" />

<!-- ✅ Inline SVG: use role + aria-label, hide children -->
<svg role="img" aria-label="Warning: action cannot be undone"
     viewBox="0 0 24 24" aria-hidden="false">
  <title>Warning</title>   <!-- fallback for older AT -->
  <path d="M12 2L2 22h20L12 2z"/>
</svg>

<!-- ✅ Icon-only SVG next to text: hide from AT entirely -->
<button>
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41..."/>
  </svg>
  Close
</button>`,
    css: null,
    react: `// ✅ React: always pass alt; use empty string for decorative
<img src={heroBanner} alt="Team collaborating on a project" />
<img src={decorativeDivider} alt="" role="presentation" />

// ✅ SVG icon component pattern
function Icon({ label, children }) {
  return label
    ? <svg role="img" aria-label={label}>{children}</svg>
    : <svg aria-hidden="true" focusable="false">{children}</svg>;
}
// Usage:
<Icon label="Warning">...</Icon>   // meaningful
<Icon>...</Icon>                   // decorative`,
    js: null,
    testSteps: [
      "Open browser DevTools → Elements tab → find every <img>",
      "Check each <img> has a meaningful alt attribute (not empty, not just the filename)",
      "For SVGs: ensure decorative ones have aria-hidden='true'; informative ones have role='img' + aria-label",
      "Use a screen reader (VoiceOver / NVDA) and tab through images — each should be announced meaningfully",
      "Run axe DevTools or Lighthouse → 'image-alt' rule should pass",
    ],
    links: [
      {
        label: "WCAG 1.1.1 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html",
      },
      {
        label: "MDN: alt attribute",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#alt",
      },
      {
        label: "Alt text decision tree",
        url: "https://www.w3.org/WAI/tutorials/images/decision-tree/",
      },
    ],
  },

  "1.3.1": {
    effort: { label: "Moderate", time: "~1–2 hours", color: "#d97706" },
    where:
      "Audit your page structure: headings, lists, tables, forms, and landmark regions.",
    before: `<!-- ❌ Div soup — no semantic meaning for AT -->
<div class="nav">
  <div class="nav-item"><a href="/">Home</a></div>
</div>
<div class="heading">Latest News</div>
<div class="data-table">
  <div class="row"><div>Name</div><div>Score</div></div>
</div>
<div class="field-wrap">
  <div>Email</div>
  <input type="email" />
</div>`,
    html: `<!-- ✅ Use landmark elements so AT users can jump between sections -->
<header><nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav></header>

<main>
  <!-- ✅ Heading hierarchy: only one h1, then h2/h3 in order -->
  <h1>Latest News</h1>
  <section aria-labelledby="section-title">
    <h2 id="section-title">Top Stories</h2>
  </section>

  <!-- ✅ Data tables with captions and scope -->
  <table>
    <caption>Q3 Accessibility Scores</caption>
    <thead>
      <tr>
        <th scope="col">Page</th>
        <th scope="col">Score</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Home</td><td>87</td></tr>
    </tbody>
  </table>

  <!-- ✅ Forms: every input labelled -->
  <form>
    <label for="email">Email address</label>
    <input id="email" type="email" autocomplete="email" />
  </form>
</main>
<footer>...</footer>`,
    css: null,
    react: `// ✅ Use semantic JSX elements — they map directly to HTML
function Page() {
  return (
    <>
      <header>
        <nav aria-label="Main navigation">...</nav>
      </header>
      <main>
        <h1>Latest News</h1>
        {/* Form with associated label */}
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" />
      </main>
      <footer>...</footer>
    </>
  );
}`,
    js: null,
    testSteps: [
      "Install the Headings Map browser extension — verify heading order (h1→h2→h3, no skips)",
      "Use screen reader 'Landmarks' shortcut to confirm header/nav/main/footer are announced",
      "Tab through every form field — each should announce its label when focused",
      "Run axe DevTools → look for 'region', 'label', 'table-duplicate-name' violations",
      "Check tables: every column/row header should have scope='col' or scope='row'",
    ],
    links: [
      {
        label: "WCAG 1.3.1 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html",
      },
      {
        label: "MDN: HTML landmark elements",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/landmark_role",
      },
      {
        label: "WebAIM: semantic structure",
        url: "https://webaim.org/techniques/semanticstructure/",
      },
    ],
  },

  "1.4.3": {
    effort: { label: "Quick fix", time: "~20 min", color: "#16a34a" },
    where:
      "Update your CSS color values — usually in design tokens, utility classes, or component styles.",
    before: `/* ❌ Fails WCAG AA — contrast ratios below 4.5:1 */
.body-text  { color: #aaaaaa; background: #ffffff; } /* 2.32:1 ❌ */
.caption    { color: #bbbbbb; background: #f5f5f5; } /* 1.85:1 ❌ */
.link       { color: #6eb8ff; background: #ffffff; } /* 3.12:1 ❌ */
.badge-muted{ color: #999999; background: #eeeeee; } /* 2.85:1 ❌ */`,
    html: null,
    css: `/* ✅ All pass WCAG AA (4.5:1 for normal text, 3:1 for large text) */

/* Body / paragraph text */
.body-text { color: #374151; background: #ffffff; } /* 10.7:1 ✅ */

/* Captions and helper text (still needs 4.5:1 if < 18pt) */
.caption   { color: #6b7280; background: #ffffff; } /* 5.74:1 ✅ */

/* Links — ensure distinguishable without colour alone */
.link {
  color: #1d4ed8;           /* 7.3:1 on white ✅ */
  text-decoration: underline; /* visible even for colour-blind users */
}
.link:hover { color: #1e40af; }

/* Badges / tags */
.badge-muted {
  color: #1f2937;           /* dark text on light bg */
  background: #e5e7eb;      /* 14.1:1 ✅ */
}

/* Dark theme — check both themes! */
@media (prefers-color-scheme: dark) {
  .body-text { color: #f3f4f6; background: #111827; } /* 16.1:1 ✅ */
}`,
    react: null,
    js: `// Utility: check contrast ratio at runtime (dev/testing tool)
function getLuminance(hex) {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16 & 255) / 255;
  const g = (rgb >> 8  & 255) / 255;
  const b = (rgb       & 255) / 255;
  const toLinear = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4;
  return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b);
}
function contrastRatio(hex1, hex2) {
  const L1 = getLuminance(hex1), L2 = getLuminance(hex2);
  const [light, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return ((light + 0.05) / (dark + 0.05)).toFixed(2);
}
// Example:
console.log(contrastRatio('#6b7280', '#ffffff')); // 5.74 ✅`,
    testSteps: [
      "Open WebAIM Contrast Checker (webaim.org/resources/contrastchecker) and test your main text/background pairs",
      "In Chrome DevTools, inspect any text element → Accessibility tab → check 'Contrast' ratio",
      "Test with Colorblinding extension (simulates 8 colour vision deficiencies)",
      "Run Lighthouse → Accessibility → look for 'color-contrast' failures",
      "Remember to test: body text, headings, placeholder text, disabled states, link text, and badge labels",
    ],
    links: [
      {
        label: "WCAG 1.4.3 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
      },
      {
        label: "WebAIM Contrast Checker",
        url: "https://webaim.org/resources/contrastchecker/",
      },
      {
        label: "Who Can Use (contrast simulator)",
        url: "https://www.whocanuse.com/",
      },
    ],
  },

  "1.4.11": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where:
      "Global CSS — typically your reset/base stylesheet or design-token file.",
    before: `/* ❌ Default browser outline removed — nothing visible on focus */
* { outline: none; }

/* ❌ Input borders too light — fails 3:1 against white background */
input { border: 1px solid #d1d5db; } /* ~1.6:1 ❌ */

/* ❌ Checkbox/radio with no visible boundary */
input[type="checkbox"] { border: none; background: #e5e7eb; }`,
    html: null,
    css: `/* ✅ Always keep a visible focus ring — never remove without replacing */
/* Remove only the browser default; add your own */
:focus { outline: none; }        /* hide browser default */
:focus-visible {                 /* show custom ring on keyboard nav */
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ✅ Form field borders — need 3:1 against background */
input, select, textarea {
  border: 2px solid #6b7280;    /* 5.9:1 on white ✅ */
  border-radius: 6px;
  padding: 8px 12px;
}
input:focus-visible {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.25);
}

/* ✅ Custom checkbox: visible box AND checked state */
input[type="checkbox"] {
  width: 18px; height: 18px;
  border: 2px solid #374151;    /* 14.3:1 ✅ */
  border-radius: 3px;
  accent-color: #2563eb;        /* native checked colour (modern browsers) */
}

/* ✅ Icon buttons need a visible boundary */
.icon-btn {
  border: 2px solid #6b7280;
  border-radius: 8px;
  padding: 8px;
  background: transparent;
}
.icon-btn:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}`,
    react: null,
    js: null,
    testSteps: [
      "Tab through the entire page without a mouse — every interactive element must show a visible ring",
      "Inspect focus ring: must have 3:1 contrast against adjacent background (use DevTools eyedropper)",
      "Check form borders: select an input, measure border vs background contrast",
      "Test custom checkboxes and radio buttons — border must be visible in unchecked state",
      "Run axe DevTools → look for 'focus-visible' and 'non-text-contrast' violations",
    ],
    links: [
      {
        label: "WCAG 1.4.11 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html",
      },
      {
        label: "MDN: :focus-visible",
        url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible",
      },
      {
        label: "WebAIM: keyboard navigation",
        url: "https://webaim.org/techniques/keyboard/",
      },
    ],
  },

  "2.1.1": {
    effort: { label: "Moderate", time: "~30–60 min", color: "#d97706" },
    where:
      "Any interactive element built from <div> or <span> instead of native HTML controls.",
    before: `<!-- ❌ Custom widget — not keyboard reachable, no role -->
<div class="dropdown" onclick="toggleMenu()">
  Options ▾
</div>

<!-- ❌ Loses focus after close — user stranded -->
<div class="modal">
  <div class="close-btn" onclick="closeModal()">✕</div>
</div>`,
    html: `<!-- ✅ Use native elements whenever possible — free keyboard support -->
<button type="button" onclick="toggleMenu()"
        aria-expanded="false" aria-controls="menu-list">
  Options ▾
</button>
<ul id="menu-list" role="menu" hidden>
  <li role="menuitem"><a href="/profile">Profile</a></li>
  <li role="menuitem"><a href="/settings">Settings</a></li>
</ul>

<!-- ✅ Custom widget: tabindex + role + keyboard handler -->
<div role="button" tabindex="0"
     aria-label="Open colour picker"
     onclick="openPicker()"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPicker();}">
  🎨
</div>

<!-- ✅ Modal: trap focus inside, restore on close -->
<dialog id="confirm-modal" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm action</h2>
  <button autofocus>Yes, continue</button>
  <button onclick="closeModal()">Cancel</button>
</dialog>`,
    css: null,
    react: `// ✅ React: use native elements; add keyboard handlers to custom widgets
function Dropdown({ items }) {
  const [open, setOpen] = React.useState(false);
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(o => !o);
    }
    if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKey}
      >
        Options ▾
      </button>
      {open && (
        <ul role="listbox">
          {items.map(item => (
            <li key={item.id} role="option">{item.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}`,
    js: `// Focus management: restore focus after closing a modal/overlay
function openModal(modal, trigger) {
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-modal', 'true');
  // Move focus to first focusable element inside modal
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable[0]?.focus();

  // Trap focus within modal
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  // On close: return focus to the element that opened the modal
  return () => { modal.hidden = true; trigger.focus(); };
}`,
    testSteps: [
      "Unplug your mouse and navigate the entire page using Tab, Shift+Tab, Enter, Space, and arrow keys",
      "Every clickable element must be reachable and activatable via keyboard",
      "Open and close every dropdown, modal, and tooltip — focus must never get 'trapped' or 'lost'",
      "After closing a modal, focus should return to the button that opened it",
      "Run axe DevTools → look for 'keyboard', 'scrollable-region-focusable', and 'tabindex' violations",
    ],
    links: [
      {
        label: "WCAG 2.1.1 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html",
      },
      {
        label: "MDN: Keyboard-navigable JS widgets",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets",
      },
      {
        label: "WAI-ARIA Authoring Practices",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/",
      },
    ],
  },

  "2.4.1": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where:
      "Add to the very top of your page layout component, before the <nav>.",
    before: `<!-- ❌ No way to skip the navbar — keyboard users tab through
     every nav link on every page before reaching content -->
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/blog">Blog</a>
    <!-- ...10 more links... -->
  </nav>
  <main>Page content here</main>
</body>`,
    html: `<!-- ✅ Skip link: first element in <body>, visually hidden until focused -->
<body>
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>

  <nav aria-label="Main navigation">
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>

  <!-- ✅ id must match href above -->
  <main id="main-content" tabindex="-1">
    <h1>Welcome</h1>
    <!-- page content -->
  </main>
</body>`,
    css: `/* ✅ Visually hidden until keyboard-focused */
.skip-link {
  position: absolute;
  top: -120%;           /* off-screen by default */
  left: 1rem;
  z-index: 9999;

  background: #1d4ed8;
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  padding: 10px 20px;
  border-radius: 0 0 10px 10px;
  text-decoration: none;
  transition: top 0.15s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Slide into view when focused */
.skip-link:focus {
  top: 0;
}`,
    react: `// ✅ React: place SkipLink as first child in your root layout
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}

function Layout({ children }) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}`,
    js: null,
    testSteps: [
      "Press Tab as your very first action on the page — the skip link should appear",
      "Press Enter on the skip link — focus should jump directly to main content (h1 or first paragraph)",
      "Verify the skip link is invisible at rest but visible when focused (never permanently visible)",
      "Test on every page template, not just the home page",
      "Run Lighthouse → Accessibility → look for 'bypass' failure",
    ],
    links: [
      {
        label: "WCAG 2.4.1 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html",
      },
      {
        label: "WebAIM: skip navigation",
        url: "https://webaim.org/techniques/skipnav/",
      },
    ],
  },

  "2.4.4": {
    effort: { label: "Quick fix", time: "~10–20 min", color: "#16a34a" },
    where:
      "Find every <a> element — pay special attention to icon links, 'Read more' links, and social icons.",
    before: `<!-- ❌ Vague — screen reader announces "link: click here"
     with no indication of the destination -->
<a href="/report.pdf">Click here</a>
<a href="/article-42">Read more</a>

<!-- ❌ Icon-only link — announced as blank or the URL -->
<a href="https://twitter.com/acme">
  <img src="twitter-icon.svg" />
</a>

<!-- ❌ Repeated identical text for different destinations -->
<a href="/post-1">Read more</a>
<a href="/post-2">Read more</a>`,
    html: `<!-- ✅ Descriptive link text — clear without surrounding context -->
<a href="/report.pdf">
  Download 2024 Accessibility Report (PDF, 2.4 MB)
</a>

<!-- ✅ "Read more" extended with visually-hidden context -->
<a href="/article-42">
  Read more
  <span class="sr-only"> about WCAG 2.4.4 link purpose</span>
</a>

<!-- ✅ Icon link: aria-label describes the destination -->
<a href="https://twitter.com/acme"
   aria-label="Follow ACME on Twitter (opens in new tab)"
   target="_blank" rel="noopener">
  <img src="twitter-icon.svg" alt="" />  <!-- alt="" because label is on <a> -->
</a>

<!-- ✅ Unique "Read more" links using aria-label -->
<a href="/post-1" aria-label="Read more about our Q3 results">Read more</a>
<a href="/post-2" aria-label="Read more about the new product launch">Read more</a>`,
    css: `/* ✅ Visually-hidden helper — works with any framework */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}`,
    react: `// ✅ Reusable VisuallyHidden component
function VisuallyHidden({ children }) {
  return <span className="sr-only">{children}</span>;
}

// Usage in a "Read more" link:
function ArticleCard({ article }) {
  return (
    <a href={article.url}>
      Read more
      <VisuallyHidden> about {article.title}</VisuallyHidden>
    </a>
  );
}

// Icon link with aria-label:
function TwitterLink({ handle }) {
  return (
    <a
      href={\`https://twitter.com/\${handle}\`}
      aria-label={\`Follow \${handle} on Twitter (opens in new tab)\`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <TwitterIcon aria-hidden="true" />
    </a>
  );
}`,
    js: null,
    testSteps: [
      "Open a screen reader and activate 'Links list' mode (NVDA: Insert+F7 / VoiceOver: VO+U then arrow to Links) — every link must make sense out of context",
      "Search your codebase for link text like 'click here', 'read more', 'here', 'learn more', 'this link'",
      "Find every icon-only <a> and confirm it has aria-label or visually-hidden text",
      "Check that links to PDFs/external sites indicate so in the label",
      "Run axe DevTools → 'link-name' rule must pass",
    ],
    links: [
      {
        label: "WCAG 2.4.4 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html",
      },
      {
        label: "WebAIM: links & hypertext",
        url: "https://webaim.org/techniques/hypertext/",
      },
      {
        label: "MDN: aria-label",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label",
      },
    ],
  },

  "2.4.7": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where:
      "Your global CSS reset/base file — typically where `outline: none` or `outline: 0` appears.",
    before: `/* ❌ The #1 accessibility mistake — removes ALL focus indicators */
* { outline: none; }
a, button, input { outline: 0; }

/* ❌ Focus style so subtle it's invisible */
:focus { outline: 1px dotted #ccc; }`,
    html: null,
    css: `/* ✅ Step 1: Remove the blanket outline suppression */
/* DELETE or replace: * { outline: none; } */

/* ✅ Step 2: Keep mouse clicks clean, keyboard nav visible */
:focus               { outline: none; }       /* hide for mouse */
:focus-visible       {                         /* show for keyboard */
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ✅ High contrast for buttons */
button:focus-visible, [role="button"]:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.25);
}

/* ✅ Links: offset so the ring doesn't overlap underline */
a:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
  border-radius: 2px;
}

/* ✅ Inputs already have borders — use box-shadow for ring */
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4);
  border-color: #2563eb;
}`,
    react: null,
    js: null,
    testSteps: [
      "Tab through every interactive element on the page — a visible ring must appear on each one",
      "Test with both keyboard (Tab) and mouse clicks — ring should only show for keyboard",
      "Check that focus ring has 3:1 contrast against the surrounding background",
      "Test in Windows High Contrast mode (Settings → Accessibility → Contrast themes)",
      "Search your codebase for 'outline: none' and 'outline: 0' — audit each instance",
    ],
    links: [
      {
        label: "WCAG 2.4.7 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html",
      },
      {
        label: "MDN: :focus-visible",
        url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible",
      },
      {
        label: "WCAG 2.4.11 (enhanced focus, WCAG 2.2)",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html",
      },
    ],
  },

  "3.3.1": {
    effort: { label: "Moderate", time: "~30–45 min", color: "#d97706" },
    where:
      "Every form on your site — look for validation logic and error message rendering.",
    before: `<!-- ❌ Error shown visually but not connected to input -->
<input type="email" class="error" />
<div class="error-msg" style="color:red">Invalid email</div>

<!-- ❌ Error conveyed only with colour — colour-blind users miss it -->
<input style="border-color: red" />`,
    html: `<!-- ✅ Associate error to input via aria-describedby -->
<div class="field">
  <label for="email">
    Email address
    <span aria-hidden="true" style="color:#c0392b"> *</span>
    <span class="sr-only">(required)</span>
  </label>

  <input
    id="email"
    type="email"
    name="email"
    autocomplete="email"
    aria-required="true"
    aria-describedby="email-hint email-error"
    aria-invalid="true"
  />

  <!-- Helper text always visible -->
  <span id="email-hint" class="field-hint">
    Format: name@example.com
  </span>

  <!-- Error: role="alert" announces immediately to screen readers -->
  <span id="email-error" role="alert" class="field-error">
    <svg aria-hidden="true"><!-- error icon --></svg>
    Please enter a valid email address.
  </span>
</div>`,
    css: `/* ✅ Error conveyed with icon + text + border (not colour alone) */
.field-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b91c1c;
  font-size: 13px;
  margin-top: 6px;
  font-weight: 600;
}

/* ✅ Error border — add thickness/style change, not just colour */
input[aria-invalid="true"] {
  border: 2px solid #dc2626;
  background: #fef2f2;
  /* also change border-style so it's distinct for colour-blind users */
  border-style: solid;
  outline-color: #dc2626;
}

.field-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}`,
    react: `// ✅ React form field with full accessible error handling
function FormField({ id, label, type = 'text', error, hint, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
        {props.required && <span className="sr-only">(required)</span>}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={[hint && \`\${id}-hint\`, error && \`\${id}-error\`]
          .filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {hint && <span id={\`\${id}-hint\`} className="field-hint">{hint}</span>}
      {error && (
        <span id={\`\${id}-error\`} role="alert" className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}`,
    js: `// ✅ Validate and set ARIA attributes on submit
document.querySelector('form').addEventListener('submit', function(e) {
  const email = document.getElementById('email');
  const errorEl = document.getElementById('email-error');
  const valid = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email.value);

  email.setAttribute('aria-invalid', String(!valid));

  if (!valid) {
    e.preventDefault();
    errorEl.hidden = false;
    errorEl.textContent = 'Please enter a valid email address.';
    email.focus(); // move focus back to the problem field
  } else {
    errorEl.hidden = true;
  }
});`,
    testSteps: [
      "Submit an empty or invalid form — error messages must appear without page reload",
      "Focus an input with an error — screen reader should announce the error message",
      "Verify errors are NOT conveyed by colour alone (add icon, border thickness, or text prefix)",
      "Check: error is linked to its field via aria-describedby (inspect the DOM)",
      "Run axe DevTools after triggering errors → look for 'label', 'aria-invalid', 'required-children' failures",
    ],
    links: [
      {
        label: "WCAG 3.3.1 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html",
      },
      {
        label: "WebAIM: accessible forms",
        url: "https://webaim.org/techniques/forms/",
      },
      {
        label: "MDN: aria-invalid",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid",
      },
    ],
  },

  "4.1.1": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where:
      "Run an HTML validator on your pages — fix any duplicate IDs and unclosed elements.",
    before: `<!-- ❌ Duplicate IDs — AT reads the first and ignores the rest -->
<div id="search">Site search</div>
<div id="search">Product search</div>  <!-- duplicate -->

<!-- ❌ Unclosed tags — breaks DOM structure -->
<ul>
  <li>Item one
  <li>Item two    <!-- each <li> never closed -->
</ul>

<!-- ❌ Incorrect nesting -->
<a href="/">
  <div>This is invalid — block inside inline</div>
</a>`,
    html: `<!-- ✅ Every ID must be unique across the entire page -->
<div id="site-search">Site search</div>
<div id="product-search">Product search</div>

<!-- ✅ Close all tags properly -->
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>

<!-- ✅ Valid nesting: inline elements inside block -->
<a href="/">
  <span>Home</span>    <!-- inline inside inline ✅ -->
</a>
<!-- OR (HTML5 allows <a> around blocks in specific cases) -->
<a href="/" style="display:contents">
  <article>...</article>
</a>`,
    css: null,
    react: null,
    js: `// Quick audit: find duplicate IDs on the current page
const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.warn('Duplicate IDs found:', [...new Set(dupes)]);
} else {
  console.log('✅ No duplicate IDs');
}`,
    testSteps: [
      "Paste your page URL into validator.w3.org — fix all reported errors and warnings",
      "In DevTools console, run: document.querySelectorAll('[id]') and check for duplicates",
      "Look for any component rendered multiple times that hardcodes an ID — make IDs dynamic",
      "Check that form labels reference valid input IDs via for/id pairs",
      "Run axe DevTools → 'duplicate-id', 'duplicate-id-active', 'duplicate-id-aria' rules",
    ],
    links: [
      {
        label: "WCAG 4.1.1 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/parsing.html",
      },
      { label: "W3C HTML Validator", url: "https://validator.w3.org/" },
    ],
  },

  "4.1.2": {
    effort: { label: "Quick fix", time: "~20 min", color: "#16a34a" },
    where:
      "Find every <button>, icon link, and custom interactive widget — look for missing labels.",
    before: `<!-- ❌ Button with only an icon — announced as "button" with no name -->
<button class="close"><svg><!-- × icon --></svg></button>
<button class="menu"><svg><!-- ☰ icon --></svg></button>

<!-- ❌ Link wrapping only an image with no alt -->
<a href="/home"><img src="logo.png" /></a>

<!-- ❌ Custom div-based widget — no role, no name, not focusable -->
<div class="star-rating" onclick="rate(5)">★★★★★</div>`,
    html: `<!-- ✅ Icon button: aria-label describes the ACTION -->
<button aria-label="Close dialog" class="close">
  <svg aria-hidden="true" focusable="false"><!-- × icon --></svg>
</button>
<button aria-label="Open navigation menu" aria-expanded="false" class="menu">
  <svg aria-hidden="true" focusable="false"><!-- ☰ icon --></svg>
</button>

<!-- ✅ Logo link: alt on the image acts as the link label -->
<a href="/">
  <img src="logo.png" alt="ACME — go to homepage" />
</a>

<!-- ✅ Custom widget: role + tabindex + aria-label + keyboard -->
<div role="radiogroup" aria-label="Rate this article">
  <button role="radio" aria-checked="false" aria-label="1 star" onclick="rate(1)">★</button>
  <button role="radio" aria-checked="false" aria-label="2 stars" onclick="rate(2)">★★</button>
  <button role="radio" aria-checked="true"  aria-label="3 stars" onclick="rate(3)">★★★</button>
</div>

<!-- ✅ Input with no visible label: use aria-label -->
<input type="search" aria-label="Search products" placeholder="Search…" />`,
    css: null,
    react: `// ✅ Icon button component — always requires a label prop
function IconButton({ label, icon: Icon, onClick, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      {...props}
    >
      <Icon aria-hidden="true" focusable="false" />
    </button>
  );
}

// Usage:
<IconButton label="Close dialog" icon={XMarkIcon} onClick={onClose} />
<IconButton label="Open menu"    icon={BarsIcon}  onClick={onMenu}  />`,
    js: `// Audit: find all interactive elements missing an accessible name
function auditAccessibleNames() {
  const selectors = 'button, a[href], input, select, textarea, [role="button"], [role="link"]';
  const issues = [];

  document.querySelectorAll(selectors).forEach(el => {
    const name = (
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent ||
      el.textContent?.trim() ||
      el.getAttribute('title') ||
      el.getAttribute('alt') ||
      el.getAttribute('placeholder')
    );
    if (!name || !name.trim()) {
      issues.push({ element: el, tag: el.tagName, role: el.getAttribute('role') });
    }
  });

  if (issues.length) {
    console.warn(\`Found \${issues.length} elements missing accessible names:\`, issues);
  } else {
    console.log('✅ All interactive elements have accessible names');
  }
  return issues;
}

auditAccessibleNames();`,
    testSteps: [
      "With a screen reader, Tab to every button and link — each must be announced with a clear, meaningful name",
      "Run auditAccessibleNames() in the browser console (see JS tab) — fix any reported elements",
      "Search codebase for <button> tags with no text content — add aria-label to each",
      "Check icon-only links (social icons, nav icons) for aria-label or descriptive img alt",
      "Run axe DevTools → 'button-name', 'link-name', 'image-alt' rules must all pass",
    ],
    links: [
      {
        label: "WCAG 4.1.2 spec",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html",
      },
      {
        label: "MDN: aria-label",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label",
      },
      {
        label: "WAI-ARIA button pattern",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/button/",
      },
    ],
  },
};

// ─── Per-criterion plain-English user impact stories ─────────────────────────
export const WCAG_USER_IMPACT = {
  "1.1.1": {
    users: ["Blind users", "Users with images disabled", "Screen reader users"],
    story:
      "A blind user relying on JAWS or NVDA will hear nothing when the screen reader reaches this image — it simply skips past it or reads out a filename like 'img_3847_final.jpg'. For meaningful images (charts, product photos, infographics) the user misses critical information entirely.",
    consequence:
      "Users cannot understand image content, may miss data or context, and face a degraded or unusable experience.",
  },
  "1.3.1": {
    users: ["Screen reader users", "Voice control users", "Keyboard users"],
    story:
      "When a form field has no programmatic label, a screen reader announces only 'edit text' when the user tabs to it — giving no indication of what to enter. Users must guess, leading to errors and form abandonment. Voice control users cannot target the field by name.",
    consequence:
      "Form completion becomes error-prone or impossible for assistive technology users, blocking access to core functionality.",
  },
  "1.4.3": {
    users: [
      "Low-vision users",
      "Elderly users",
      "Users in bright environments",
    ],
    story:
      "Users with low vision, age-related vision changes, or reading disabilities struggle to read low-contrast text. In bright sunlight on a mobile screen, even fully-sighted users cannot read text that fails this criterion. It affects roughly 1 in 12 men and 1 in 200 women who have colour vision deficiencies.",
    consequence:
      "Content becomes unreadable for a significant portion of your audience, especially on mobile and in outdoor settings.",
  },
  "1.4.11": {
    users: ["Keyboard users", "Switch-access users", "Motor-impaired users"],
    story:
      "A keyboard-only user cannot see which UI element they are currently interacting with if the border or focus indicator has low contrast. Form inputs, checkboxes, and custom controls become effectively invisible — users do not know which field is active.",
    consequence:
      "Keyboard and switch users lose their position on the page constantly, making forms and interactive widgets extremely frustrating to use.",
  },
  "2.1.1": {
    users: [
      "Keyboard-only users",
      "Motor-impaired users",
      "Power users",
      "Screen reader users",
    ],
    story:
      "Users who cannot use a mouse — including people with motor impairments and those using keyboard navigation — are completely blocked by interactive elements built from non-semantic HTML like <div> or <span>. Tab key skips them entirely, and Enter / Space do nothing.",
    consequence:
      "Key interactive elements (menus, modals, custom widgets) are completely inaccessible to keyboard users — a WCAG Level A blocker.",
  },
  "2.4.1": {
    users: ["Keyboard users", "Screen reader users", "Motor-impaired users"],
    story:
      "A keyboard-only user must Tab through every navigation link (often 10–20 items) on every single page load before reaching the main content. For a user with a motor impairment this is physically exhausting; for a screen reader user it wastes minutes per page.",
    consequence:
      "Without a skip link, repetitive navigation makes the site tedious and slow for keyboard and screen reader users, especially on long pages.",
  },
  "2.4.4": {
    users: [
      "Screen reader users",
      "Cognitive disability users",
      "Voice control users",
    ],
    story:
      "When a screen reader reads the link list on a page, it may announce 'click here, click here, click here, read more, read more' with no indication of where each link goes. Users cannot scan for the link they need and must follow each one blindly to discover its destination.",
    consequence:
      "Navigation becomes guesswork for screen reader users. Voice control users cannot activate links by name since generic text like 'click here' is ambiguous.",
  },
  "2.4.7": {
    users: ["Keyboard users", "Motor-impaired users", "Switch-access users"],
    story:
      "A sighted keyboard user has no visible cursor indicator — they immediately lose their position on the page. This is equivalent to hiding the text cursor while typing. Users must Tab through every element from the start to find where they are.",
    consequence:
      "Keyboard navigation becomes disorienting and unusable. Many users will abandon the page rather than continue without a visible focus indicator.",
  },
  "3.1.1": {
    users: [
      "Screen reader users",
      "Translation tool users",
      "Language learners",
    ],
    story:
      "Screen readers use the page language to select the correct pronunciation engine. Without a lang attribute, JAWS may read French text with English pronunciation rules, making it incomprehensible. Browser translation tools also fail to auto-detect and translate the page.",
    consequence:
      "Multilingual users and those relying on screen readers in non-English languages receive garbled or incorrect audio output.",
  },
  "3.3.1": {
    users: [
      "Screen reader users",
      "Cognitive disability users",
      "Voice control users",
    ],
    story:
      "When a form is submitted with errors and feedback is communicated only through color (red border) or icons, screen reader users receive no feedback at all. They may repeatedly attempt to submit a broken form without knowing what went wrong or where the error is.",
    consequence:
      "Users with visual impairments cannot complete forms independently. Error recovery becomes impossible without text-based error messages.",
  },
  "4.1.1": {
    users: ["Screen reader users", "Assistive technology users"],
    story:
      "Duplicate element IDs break the association between HTML labels and their controls. A label referencing an ID that appears twice binds to the wrong element — the screen reader user hears the wrong field name when they focus an input, leading to confusing and incorrect form data.",
    consequence:
      "Form structure becomes unreliable for assistive technologies. Users may fill in the wrong fields or be unable to understand the form structure at all.",
  },
  "4.1.2": {
    users: ["Screen reader users", "Voice control users", "Keyboard users"],
    story:
      "A screen reader user hears only 'button' with no name when they focus an icon button. They have no idea what it does — submit, delete, edit, or something else. They must activate it and observe the outcome, which can have irreversible consequences like deleting content.",
    consequence:
      "Icon-only buttons and links are completely unusable by screen reader users. Voice control users cannot activate them by speaking their name.",
  },
};

export const getGenericUserImpact = (severity) => {
  const sev = (severity || "").toLowerCase();
  if (sev === "high" || sev === "critical" || sev === "serious") {
    return "This is a critical barrier that may completely prevent users with disabilities from accessing or using this feature. People who rely on screen readers, keyboard navigation, or other assistive technologies are directly affected.";
  }
  if (sev === "medium" || sev === "moderate" || sev === "warning") {
    return "This issue creates a significant obstacle for users with disabilities. While some workarounds may exist, the experience is degraded and may lead to errors or abandonment for users of assistive technologies.";
  }
  return "This issue reduces the accessibility quality for users with disabilities. Addressing it improves the overall experience for screen reader users, keyboard navigators, and users with cognitive or visual impairments.";
};

// ─── Visual before/after previews (self-contained srcdoc HTML) ───────────────
const BASE = `<style>*{box-sizing:border-box}body{margin:12px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.45;color:#334155}</style>`;
export const WCAG_PREVIEWS = {
  "1.1.1": {
    broken:
      BASE +
      `<div style="background:#e2e8f0;width:90px;height:52px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;margin-bottom:6px">image</div><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ Screen reader announces: "" (silent)</p>`,
    fixed:
      BASE +
      `<div style="background:#e2e8f0;width:90px;height:52px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;margin-bottom:6px">image</div><p style="margin:0;color:#16a34a;font-size:11.5px">✓ Screen reader: "Team collaborating around a laptop"</p>`,
  },
  "1.3.1": {
    broken:
      BASE +
      `<input type="text" placeholder="Enter your name" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;width:100%;font-size:13px;margin-bottom:6px"><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ Screen reader: "edit text" — field has no label</p>`,
    fixed:
      BASE +
      `<label style="display:block;font-weight:600;margin-bottom:4px">Full name</label><input type="text" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;width:100%;font-size:13px;margin-bottom:6px"><p style="margin:0;color:#16a34a;font-size:11.5px">✓ Screen reader: "Full name, edit text"</p>`,
  },
  "1.4.3": {
    broken:
      BASE +
      `<div style="padding:10px;border-radius:6px;border:1px solid #f1f5f9"><p style="color:#bbb;margin:0 0 4px;font-size:15px">Welcome back, Sarah</p><p style="color:#ccc;margin:0;font-size:12px">Your subscription renews tomorrow</p><p style="margin:6px 0 0;color:#dc2626;font-size:11px">⚠ Contrast ratio ~2.3:1 — fails WCAG AA</p></div>`,
    fixed:
      BASE +
      `<div style="padding:10px;border-radius:6px;border:1px solid #f1f5f9"><p style="color:#1e293b;margin:0 0 4px;font-size:15px">Welcome back, Sarah</p><p style="color:#475569;margin:0;font-size:12px">Your subscription renews tomorrow</p><p style="margin:6px 0 0;color:#16a34a;font-size:11px">✓ Contrast ratio ~8.6:1 — passes WCAG AA</p></div>`,
  },
  "1.4.11": {
    broken:
      BASE +
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:16px;height:16px;border:1.5px solid #e5e7eb;border-radius:3px;display:inline-block"></span><span>Subscribe to newsletter</span></div><input placeholder="Search…" style="padding:5px 8px;border:1px solid #efefef;border-radius:4px;font-size:13px;width:100%;margin-bottom:6px"><p style="margin:0;color:#dc2626;font-size:11px">⚠ UI borders fail 3:1 contrast ratio</p>`,
    fixed:
      BASE +
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:16px;height:16px;border:2px solid #4b5563;border-radius:3px;display:inline-block"></span><span>Subscribe to newsletter</span></div><input placeholder="Search…" style="padding:5px 8px;border:2px solid #64748b;border-radius:4px;font-size:13px;width:100%;margin-bottom:6px"><p style="margin:0;color:#16a34a;font-size:11px">✓ UI borders meet 3:1 contrast ratio</p>`,
  },
  "2.1.1": {
    broken:
      BASE +
      `<div style="background:#189b97;color:#fff;padding:8px 14px;border-radius:6px;display:inline-block;cursor:pointer;margin-bottom:6px">Open Menu</div><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ &lt;div&gt; — Tab key skips this, Enter does nothing</p>`,
    fixed:
      BASE +
      `<button style="background:#189b97;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;margin-bottom:6px">Open Menu</button><p style="margin:0;color:#16a34a;font-size:11.5px">✓ &lt;button&gt; — Tab reaches it, Enter/Space activates it</p>`,
  },
  "2.4.1": {
    broken:
      BASE +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px"><div style="display:flex;gap:10px;margin-bottom:6px"><a href="#" style="color:#3b82f6;font-size:12px">Home</a><a href="#" style="color:#3b82f6;font-size:12px">About</a><a href="#" style="color:#3b82f6;font-size:12px">Services</a><a href="#" style="color:#3b82f6;font-size:12px">Contact</a></div><p style="margin:0;color:#dc2626;font-size:11px">⚠ Must Tab through all 4 nav links to reach content</p></div>`,
    fixed:
      BASE +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px"><a href="#main" style="display:inline-block;background:#0f172a;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;margin-bottom:5px;text-decoration:none">Skip to main content</a><div style="display:flex;gap:10px;margin-bottom:4px"><a href="#" style="color:#3b82f6;font-size:12px">Home</a><a href="#" style="color:#3b82f6;font-size:12px">About</a></div><p style="margin:0;color:#16a34a;font-size:11px">✓ 1st Tab press skips nav entirely</p></div>`,
  },
  "2.4.4": {
    broken:
      BASE +
      `<p style="margin:0 0 6px">Read our report. <a href="#" style="color:#3b82f6">Click here</a></p><p style="margin:0 0 6px">See pricing. <a href="#" style="color:#3b82f6">Click here</a></p><p style="margin:0 0 6px">Get support. <a href="#" style="color:#3b82f6">Click here</a></p><p style="margin:4px 0 0;color:#dc2626;font-size:11px">⚠ Screen reader link list: "click here, click here, click here"</p>`,
    fixed:
      BASE +
      `<p style="margin:0 0 6px"><a href="#" style="color:#189b97">Download 2024 Annual Report (PDF)</a></p><p style="margin:0 0 6px"><a href="#" style="color:#189b97">View pricing plans</a></p><p style="margin:0 0 6px"><a href="#" style="color:#189b97">Contact support team</a></p><p style="margin:4px 0 0;color:#16a34a;font-size:11px">✓ Each link describes exactly where it goes</p>`,
  },
  "2.4.7": {
    broken:
      BASE +
      `<style>*:focus{outline:none!important}</style><p style="margin:0 0 8px;color:#64748b;font-size:11px">Tab key is on this button — can you tell?</p><button style="background:#189b97;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px">Submit</button><p style="margin:6px 0 0;color:#dc2626;font-size:11px">⚠ No ring — keyboard users have no visual position</p>`,
    fixed:
      BASE +
      `<p style="margin:0 0 8px;color:#64748b;font-size:11px">Tab key is on this button — clearly visible:</p><button style="background:#189b97;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;outline:3px solid #0f172a;outline-offset:3px">Submit</button><p style="margin:6px 0 0;color:#16a34a;font-size:11px">✓ Focus ring clearly shows keyboard position</p>`,
  },
  "3.3.1": {
    broken:
      BASE +
      `<label style="display:block;font-weight:600;margin-bottom:4px">Email</label><input type="email" value="not-an-email" style="padding:6px 10px;border:2px solid #ef4444;border-radius:4px;width:100%;font-size:13px;color:#ef4444;margin-bottom:4px"><p style="margin:0;color:#dc2626;font-size:11px">⚠ Red border only — screen reader users get no error message</p>`,
    fixed:
      BASE +
      `<label style="display:block;font-weight:600;margin-bottom:4px">Email</label><input type="email" value="not-an-email" style="padding:6px 10px;border:2px solid #ef4444;border-radius:4px;width:100%;font-size:13px;margin-bottom:4px"><p role="alert" style="margin:0 0 4px;color:#dc2626;font-size:11.5px;background:#fef2f2;padding:4px 8px;border-radius:4px">⚠ Enter a valid email, e.g. name@example.com</p><p style="margin:0;color:#16a34a;font-size:11px">✓ Text message announced immediately by screen readers</p>`,
  },
  "4.1.1": {
    broken:
      BASE +
      `<code style="display:block;background:#fef2f2;padding:8px;border-radius:6px;font-size:11.5px;border:1px solid #fca5a5;line-height:1.8">&lt;input id="<b style="color:#dc2626">name</b>"&gt;<br>&lt;label for="<b style="color:#dc2626">name</b>"&gt;First&lt;/label&gt;<br>&lt;input id="<b style="color:#dc2626">name</b>"&gt; ← duplicate!</code><p style="margin:6px 0 0;color:#dc2626;font-size:11px">⚠ Duplicate IDs — label binds to wrong element</p>`,
    fixed:
      BASE +
      `<code style="display:block;background:#f0fdf4;padding:8px;border-radius:6px;font-size:11.5px;border:1px solid #86efac;line-height:1.8">&lt;input id="<b style="color:#16a34a">first-name</b>"&gt;<br>&lt;label for="<b style="color:#16a34a">first-name</b>"&gt;First&lt;/label&gt;<br>&lt;input id="<b style="color:#16a34a">last-name</b>"&gt; ← unique</code><p style="margin:6px 0 0;color:#16a34a;font-size:11px">✓ Unique IDs — every label targets the correct input</p>`,
  },
  "4.1.2": {
    broken:
      BASE +
      `<button style="background:#189b97;border:none;color:#fff;width:36px;height:36px;border-radius:6px;cursor:pointer;font-size:18px;margin-bottom:6px">✕</button><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ Screen reader: "button" — user has no idea what this does</p>`,
    fixed:
      BASE +
      `<button aria-label="Close dialog" style="background:#189b97;border:none;color:#fff;width:36px;height:36px;border-radius:6px;cursor:pointer;font-size:18px;margin-bottom:6px">✕</button><p style="margin:0;color:#16a34a;font-size:11.5px">✓ Screen reader: "Close dialog, button"</p>`,
  },
};

export { WCAG_CODE_SUGGESTIONS };
export default {
  WCAG_USER_IMPACT,
  getGenericUserImpact,
  WCAG_PREVIEWS,
};
