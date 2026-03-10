// Mock data for UI preview — uses real output from https://uxia.ca/
export const MOCK_URL = "https://uxia.ca/";

export const MOCK_ANALYSIS = {
  url: MOCK_URL,
  html: "<html><body><p>Demo</p></body></html>",
  stylesheets: [],
  aiAnalysis: {
    score: 59,

    overallSummary:
      "The UXID Lab website presents a clean and modern design. The visual hierarchy benefits from the use of distinct section titles ('Playfair Display' font) and clear separation of content blocks. The layout is generally well-structured, employing a grid system for people profiles and a flexbox-based approach for teaching and research sections, promoting responsiveness across devices. However, the numerous accessibility violations significantly undermine the user experience, particularly for individuals relying on assistive technologies.",

    hciSummary:
      "The UXID Lab website presents a clean and modern design. The visual hierarchy benefits from the use of distinct section titles ('Playfair Display' font) and clear separation of content blocks. The layout is generally well-structured, employing a grid system for people profiles and a flexbox-based approach for teaching and research sections, promoting responsiveness across devices. However, the numerous accessibility violations significantly undermine the user experience, particularly for individuals relying on assistive technologies.\n\nThe interaction patterns appear straightforward, relying on standard link navigation. The hover effects on content boxes and person cards provide visual feedback, enhancing the sense of interactivity. However, the underlying accessibility issues, particularly the lack of discernible text for links and buttons, introduce significant usability hurdles. This lack of proper labeling severely impacts learnability and discoverability of actions, as users cannot readily determine the purpose or destination of interactive elements.\n\nFrom a cognitive load perspective, the site appears relatively manageable for typical users due to its clear structure. However, the missing link and button names place a considerable burden on users with disabilities. They must either guess the destination of each link or rely on context, which is not always sufficient. This increases cognitive effort and can lead to frustration. The inconsistent link naming also degrades predictability, as users cannot rely on consistent patterns to anticipate actions.\n\nMobile usability benefits from the responsive design, which adapts the layout to smaller screen sizes. The 'Roboto' font is legible and the overall structure is maintained. However, the underlying accessibility issues remain, and the lack of clear link and button labels is exacerbated on mobile devices, where screen real estate is limited and users often rely on touch or voice input. The absence of a skip navigation link is a further impediment for keyboard users, especially on longer pages. Error prevention strategies are not evident, and the site would benefit from more robust error handling and informative error messages.\n\nOverall, the site's aesthetic strengths are overshadowed by critical accessibility flaws. Addressing these issues would significantly enhance the user experience for all visitors, especially those with disabilities. Prioritizing clear and consistent labeling, ensuring sufficient contrast, and providing keyboard navigation support are essential steps toward creating a truly inclusive and usable website. The absence of automated testing in the development workflow is a significant factor contributing to the accumulation of accessibility debt.",

    categoryScores: {
      Perceivable:    100,
      Operable:        41,
      Understandable: 100,
      Robust:          67,
    },

    categoryExplanations: {
      Perceivable:
        "No specific WCAG perceivable issues were identified. Images and text appear to meet basic perceivability requirements.",
      Operable:
        "Multiple links lack discernible text, making navigation difficult for screen reader users. This is a significant barrier to operability.",
      Understandable:
        "No specific WCAG understandable issues were identified. The language and structure appear clear.",
      Robust:
        "Several buttons and links are missing accessible names, which means assistive technologies cannot communicate their purpose to users.",
    },

    levelScores: {
      A:   59,
      AA:  59,
      AAA: 59,
    },

    scoreBreakdown: {
      levelA:   59,
      levelAA:  59,
      levelAAA: 59,
    },

    nextSteps: [
      "Add descriptive text to all links to explain their purpose, especially where the destination is not clear from the surrounding content. This is a high priority for screen reader users.",
      "Provide accessible names for all buttons using aria-label or visually hidden text so that assistive technology users can understand their function.",
      "Ensure sufficient contrast between text and background colors to meet WCAG 1.4.3, benefiting users with low vision.",
      "Implement a skip navigation link to allow keyboard users to bypass repetitive content at the top of the page.",
      "Conduct regular accessibility audits using automated tools and manual testing to identify and address issues early in the development process.",
      "Consider adding ARIA landmarks to better define page regions for assistive technology users.",
      "Review and simplify complex language to improve readability and comprehension for users with cognitive disabilities (WCAG 3.1.5 AAA).",
      "Consistently use the same terminology and design patterns throughout the website to enhance predictability and reduce cognitive load.",
      "Test the website with a diverse group of users, including people with disabilities, to gather feedback and identify usability issues.",
      "Provide alternative text descriptions for all images to convey their content and function to users who cannot see them.",
    ],

    // wcagCriterion prefix drives POUR grouping: 2.x → Operable, 4.x → Robust
    groups: [
      {
        wcagCriterion: "2.4.4 Link Purpose (In Context)",
        severity: "Medium",
        count: 2,
        problem:
          "Many links do not have discernible text, so it's not clear where they lead. This makes navigation difficult, especially for screen reader users.",
        recommendation:
          "Ensure that all links have clear, descriptive text that explains their purpose and destination. If the link destination isn't clear from the surrounding content, add visually hidden text to provide additional context.",
      },
      {
        wcagCriterion: "2.4.4 Link Purpose (In Context)",
        severity: "Medium",
        count: 30,
        problem:
          "Thirty additional links do not have discernible text, so it's not clear where they lead. This makes navigation difficult, especially for screen reader users.",
        recommendation:
          "Ensure that all links have clear, descriptive text that explains their purpose and destination. If the link destination isn't clear from the surrounding content, add visually hidden text to provide additional context.",
      },
      {
        wcagCriterion: "2.4.4 Link Purpose (In Context)",
        severity: "Medium",
        count: 1,
        problem:
          "One additional link does not have discernible text, so it's not clear where they lead. This makes navigation difficult, especially for screen reader users.",
        recommendation:
          "Ensure that all links have clear, descriptive text that explains their purpose and destination. If the link destination isn't clear from the surrounding content, add visually hidden text to provide additional context.",
      },
      {
        wcagCriterion: "4.1.2 Name, Role, Value",
        severity: "High",
        count: 2,
        problem:
          "Buttons are missing accessible names. This means that users of assistive technology, such as screen readers, will not be able to understand the purpose of the button, making the site unusable.",
        recommendation:
          "Provide a descriptive, accessible name for each button using appropriate HTML attributes such as aria-label or visually hidden text.",
      },
      {
        wcagCriterion: "4.1.2 Name, Role, Value",
        severity: "High",
        count: 32,
        problem:
          "Links are missing accessible names. This means that users of assistive technology, such as screen readers, will not be able to understand the purpose of the link, making the site difficult or impossible to navigate.",
        recommendation:
          "Provide a descriptive, accessible name for each link using appropriate HTML attributes such as aria-label or visually hidden text.",
      },
    ],
  },
};

export const MOCK_PREVIEW = {
  screenshot: null,
  steps: [
    { type: "click", x: 300, y: 180, label: "Checking primary navigation…" },
    { type: "highlight", x: 260, y: 160, width: 220, height: 50, issue: "Nav links may have low contrast." },
    { type: "click", x: 420, y: 380, label: "Scanning main call-to-action button…" },
    { type: "highlight", x: 380, y: 360, width: 180, height: 60, issue: "Button contrast below WCAG AA threshold." },
  ],
};
