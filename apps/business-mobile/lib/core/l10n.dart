import 'package:flutter/material.dart';

const _strings = <String, Map<String, String>>{
  'en': {
    'splashTagline':'Dashboard for pros & owners','business':'BUSINESS','signIn':'Business Sign In','signInBody':'Secure access for owners, managers, receptionists and professionals.','emailPhone':'Email or phone','password':'Password','keepSignedIn':'Keep me signed in','signingIn':'Signing in…','loginMissing':'Enter your email/phone and password.','apiConfigured':'API URL is configured at build time for production.',
    'setup':'Business Setup','onboarding':'Business Onboarding','onboardingBody':'Set locations, services, staff, payout, tax, and compliance basics.','continue':'Continue',
    'dashboard':'Dashboard','calendar':'Calendar','floor':'Floor','clients':'Clients','more':'More','theme':'Theme','language':'Language','notifications':'Notifications',
    'operations':'Operations','operationsBody':'Live company data. Access is limited by your assigned role and branch scope.','services':'Services','professionals':'Professionals','staff':'Staff & permissions','payments':'Payments','finance':'Finance reconciliation','analytics':'Analytics','queue':'Walk-in queue','promotions':'Promotions','inventory':'Inventory','commissions':'Commissions','forms':'Consent forms','reviews':'Reviews','branches':'Branches','subscription':'Subscription','audit':'Audit log','signOut':'Sign out','retry':'Retry','noRecords':'No records yet','overview':'Business Overview','appointments':'Appointments','liveFloor':'Live Floor & Resources','customers':'Customers','details':'Details','item':'Item','items':'items','unableLoad':'Unable to load'
  },
  'ar': {
    'splashTagline':'لوحة تحكم للمحترفين والمالكين','business':'الأعمال','signIn':'تسجيل دخول الأعمال','signInBody':'دخول آمن للمالكين والمديرين وموظفي الاستقبال والمحترفين.','emailPhone':'البريد أو الهاتف','password':'كلمة المرور','keepSignedIn':'ابقني مسجلاً','signingIn':'جارٍ تسجيل الدخول…','loginMissing':'أدخل البريد/الهاتف وكلمة المرور.','apiConfigured':'عنوان API يتم ضبطه وقت بناء نسخة الإنتاج.',
    'setup':'إعداد المنشأة','onboarding':'تهيئة المنشأة','onboardingBody':'اضبط المواقع والخدمات والموظفين والمدفوعات والضرائب ومتطلبات الامتثال.','continue':'متابعة',
    'dashboard':'لوحة التحكم','calendar':'التقويم','floor':'الصالة','clients':'العملاء','more':'المزيد','theme':'المظهر','language':'اللغة','notifications':'الإشعارات',
    'operations':'العمليات','operationsBody':'بيانات حية للمنشأة. الوصول محدود حسب الدور والفرع المعيّن.','services':'الخدمات','professionals':'المحترفون','staff':'الموظفون والصلاحيات','payments':'المدفوعات','finance':'المطابقة المالية','analytics':'التحليلات','queue':'طابور الدخول','promotions':'العروض','inventory':'المخزون','commissions':'العمولات','forms':'نماذج الموافقة','reviews':'التقييمات','branches':'الفروع','subscription':'الاشتراك','audit':'سجل التدقيق','signOut':'تسجيل الخروج','retry':'إعادة المحاولة','noRecords':'لا توجد سجلات بعد','overview':'نظرة عامة','appointments':'المواعيد','liveFloor':'الصالة والموارد مباشرة','customers':'العملاء','details':'التفاصيل','item':'عنصر','items':'عناصر','unableLoad':'تعذر التحميل'
  },
  'fr': {
    'splashTagline':'Tableau de bord pour pros et propriétaires','business':'ENTREPRISE','signIn':'Connexion entreprise','signInBody':'Accès sécurisé pour propriétaires, managers, réceptionnistes et professionnels.','emailPhone':'E-mail ou téléphone','password':'Mot de passe','keepSignedIn':'Rester connecté','signingIn':'Connexion…','loginMissing':'Saisissez votre e-mail/téléphone et votre mot de passe.','apiConfigured':'L’URL API est configurée lors du build de production.',
    'setup':'Configuration entreprise','onboarding':'Démarrage entreprise','onboardingBody':'Configurez les lieux, services, équipes, paiements, taxes et exigences de conformité.','continue':'Continuer',
    'dashboard':'Tableau de bord','calendar':'Calendrier','floor':'Salle','clients':'Clients','more':'Plus','theme':'Thème','language':'Langue','notifications':'Notifications',
    'operations':'Opérations','operationsBody':'Données en direct. L’accès est limité par votre rôle et votre succursale.','services':'Services','professionals':'Professionnels','staff':'Équipe et permissions','payments':'Paiements','finance':'Rapprochement financier','analytics':'Analyses','queue':'File sans rendez-vous','promotions':'Promotions','inventory':'Stock','commissions':'Commissions','forms':'Formulaires de consentement','reviews':'Avis','branches':'Succursales','subscription':'Abonnement','audit':'Journal d’audit','signOut':'Se déconnecter','retry':'Réessayer','noRecords':'Aucun enregistrement','overview':'Vue d’ensemble','appointments':'Rendez-vous','liveFloor':'Salle et ressources en direct','customers':'Clients','details':'Détails','item':'Élément','items':'éléments','unableLoad':'Impossible de charger'
  },
};

String bt(BuildContext context, String key) {
  final code = Localizations.localeOf(context).languageCode;
  return _strings[code]?[key] ?? _strings['en']?[key] ?? key;
}
