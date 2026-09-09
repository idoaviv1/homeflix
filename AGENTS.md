# Homeflix — Project Guidelines & Mandatory Multi-Platform Rules

## חוק ברזל: סנכרון רב-פלטפורמי מלא ואוטומטי (Web, iOS IPA, Galaxy Android APK)
בכל תיקון תקלה, שיפור חוויית משתמש, שינוי עיצובי או תוספת פיצ'ר שהמשתמש מבקש:
1. **חובה להחיל את השינוי אוטומטית בכל שלוש הגרסאות**:
   - **אתר ה-Web**: נבנה ונבדק ב-`apps/web` (פורט 8096).
   - **אפליקציית iPhone (iOS IPA)**: מסונכרנת באמצעות `npx cap sync ios`, מותאמת לסביבת Capacitor iOS, ומתעדכנת כחבילת IPA בנתיב `/media/windows/Shared-IPA/`.
   - **אפליקציית Galaxy S22 Ultra (Android APK)**: מסונכרנת באמצעות `npx cap sync android`, שומרת על תאימות אנדרואיד (Cleartext HTTP, Network Security Config, הרשאות אחסון ורשת), ונבנית/נשמרת כחבילת APK בנתיב `/media/windows/Shared-APK/homeflix/`.

2. **אין להשאיר פלטפורמה מאחור**:
   - כל תיקון באתר ה-Web חייב להשתקף מיידית ב-Capacitor ובקבצי ההתקנה.
   - כתובות API, ערוצי הזרמה, והגדרות שרת חייבים לפעול בצורה שקופה גם בדפדפן וגם במכשירי Native Mobile.
   - שתי תיקיות השיתוף חייבות להיות מעודכנות ומסודרות:
     - `/media/windows/Shared-IPA/` עבור קובצי האייפון (`Homeflix.ipa`).
     - `/media/windows/Shared-APK/homeflix/` עבור קובצי הגלקסי (`Homeflix-Galaxy-S22-Ultra.apk`).
