export type Locale = 'he' | 'en';

export const translations = {
  he: {
    nav: {
      allMakes: 'כל היצרנים',
      popularModels: 'דגמים פופולריים',
      compare: 'השוואה',
      rankings: 'דירוגים',
      repairs: 'עלויות תיקון',
      tco: 'עלות החזקה',
      admin: 'ניהול',
      login: 'התחברות',
      loginRegister: 'התחברות / הרשמה',
      logout: 'יציאה',
      search: 'חיפוש',
    },
    hero: {
      badge: '🇮🇱 הקהילה הגדולה ביותר לבעלי רכב בישראל',
      headline1: 'הדרך החכמה',
      headline2: 'לבחור רכב',
      sub: 'ביקורות אמיתיות של בעלי רכב בישראל. מצא בעיות נפוצות לפי יצרן, דגם ושנה.',
      makes: 'יצרנים',
      models: 'דגמים',
      aiPowered: 'בינה מלאכותית',
    },
    home: {
      popularMakes: 'יצרנים פופולריים',
      popularSub: 'הדגמים הנפוצים ביותר בישראל',
      allMakes: 'כל היצרנים ←',
      models: 'דגמים',
      topRanked: '🏆 מדורגים',
      allRankings: 'כל הדירוגים ←',
      recentReviews: '💬 ביקורות אחרונות',
      howTitle: 'איך זה עובד?',
      steps: [
        { icon: '🔍', title: 'בחר את הרכב שלך', desc: 'חפש לפי יצרן, דגם ושנת ייצור.' },
        { icon: '📋', title: 'קרא ביקורות אמיתיות', desc: 'ראה בעיות נפוצות שדיווחו בעלי רכב כמוך.' },
        { icon: '✏️', title: 'שתף את הניסיון שלך', desc: 'כתב ביקורת ועזור לאחרים להתמודד עם אותן בעיות.' },
      ],
    },
    footer: {
      tagline: 'ביקורות רכב אמיתיות · ניתוח AI',
      about: 'המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות בעברית וחוות דעת של בעלי רכב.',
      quickNav: 'ניווט מהיר',
      links: [
        { href: '/cars', label: 'כל היצרנים' },
        { href: '/repairs', label: 'עלויות תיקון' },
        { href: '/tco', label: 'עלות החזקה' },
        { href: '/terms', label: 'תנאי שימוש' },
        { href: '/privacy', label: 'מדיניות פרטיות' },
        { href: '/contact', label: 'צור קשר' },
      ],
      disclaimer: 'כתב ויתור',
      disclaimerText: 'המידע באתר מבוסס על חוות דעת של משתמשים ואינו תחליף לייעוץ מקצועי ממוסך מורשה.',
      copyright: 'CarIssues IL. כל הזכויות שמורות.',
      builtWith: 'בנוי עם ♥ לרווחת נהגי ישראל',
      legal: 'סמלי היצרנים הם סימני מסחר רשומים של בעליהם בהתאמה. האתר אינו קשור ליצרנים. מודלים תלת-ממדיים ב-Sketchfab מוצגים לפי רישיון CC BY 4.0 עם קרדיט ליוצרים. האתר משתמש בעוגיות לצורך פונקציונליות בסיסית (התחברות). אין שימוש בעוגיות פרסומיות.',
    },
    search: {
      placeholder: 'חפש יצרן או דגם... (למשל: יונדאי, טוסון, מאזדה CX-5)',
      placeholderShort: 'חפש יצרן או דגם...',
      make: 'יצרן',
      model: 'דגם',
      allModels: 'כל הדגמים',
    },
  },
  en: {
    nav: {
      allMakes: 'All Makes',
      popularModels: 'Popular Models',
      compare: 'Compare',
      rankings: 'Rankings',
      repairs: 'Repair Costs',
      tco: 'Ownership Cost',
      admin: 'Admin',
      login: 'Sign In',
      loginRegister: 'Sign In / Register',
      logout: 'Sign Out',
      search: 'Search',
    },
    hero: {
      badge: "🇮🇱 Israel's largest car owner community",
      headline1: 'Discover issues with',
      headline2: 'your car — early',
      sub: 'Real reviews from Israeli car owners. Find common problems by make, model and year.',
      makes: 'Makes',
      models: 'Models',
      aiPowered: 'AI Powered',
    },
    home: {
      popularMakes: 'Popular Makes',
      popularSub: 'Most popular models in Israel',
      allMakes: 'All Makes →',
      models: 'models',
      topRanked: '🏆 Top Ranked',
      allRankings: 'All Rankings →',
      recentReviews: '💬 Recent Reviews',
      howTitle: 'How it works',
      steps: [
        { icon: '🔍', title: 'Find your car', desc: 'Search by make, model and year.' },
        { icon: '📋', title: 'Read real reviews', desc: 'See common issues reported by owners like you.' },
        { icon: '✏️', title: 'Share your experience', desc: 'Write a review and help others deal with the same issues.' },
      ],
    },
    footer: {
      tagline: 'Real car reviews · AI analysis',
      about: "Israel's largest database of car issues, real reviews and owner opinions.",
      quickNav: 'Quick Navigation',
      links: [
        { href: '/cars', label: 'All Makes' },
        { href: '/repairs', label: 'Repair Costs' },
        { href: '/tco', label: 'Ownership Cost' },
        { href: '/terms', label: 'Terms of Use' },
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/contact', label: 'Contact' },
      ],
      disclaimer: 'Disclaimer',
      disclaimerText: 'Information on this site is based on user opinions and is not a substitute for professional advice from a licensed garage.',
      copyright: 'CarIssues IL. All rights reserved.',
      builtWith: 'Built with ♥ for Israeli drivers',
      legal: 'Manufacturer logos are registered trademarks of their respective owners. This site is not affiliated with any manufacturer. 3D models on Sketchfab are displayed under CC BY 4.0 license with creator credit. This site uses cookies for basic functionality (login only). No advertising cookies are used.',
    },
    search: {
      placeholder: 'Search make or model... (e.g. Hyundai, Tucson, Mazda CX-5)',
      placeholderShort: 'Search make or model...',
      make: 'Make',
      model: 'Model',
      allModels: 'All Models',
    },
  },
} as const;

// Structural type — works for both locales
export type Translations = {
  nav: { allMakes: string; popularModels: string; compare: string; rankings: string; repairs: string; tco: string; admin: string; login: string; loginRegister: string; logout: string; search: string };
  hero: { badge: string; headline1: string; headline2: string; sub: string; makes: string; models: string; aiPowered: string };
  home: { popularMakes: string; popularSub: string; allMakes: string; models: string; topRanked: string; allRankings: string; recentReviews: string; howTitle: string; steps: readonly { icon: string; title: string; desc: string }[] };
  footer: { tagline: string; about: string; quickNav: string; links: readonly { href: string; label: string }[]; disclaimer: string; disclaimerText: string; copyright: string; builtWith: string; legal: string };
  search: { placeholder: string; placeholderShort: string; make: string; model: string; allModels: string };
};
