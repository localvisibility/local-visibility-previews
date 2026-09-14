// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE SERVICE V12 SECTORS - Architecture cohérente par secteur
// Chaque secteur définit TOUT : couleurs, hero, services, valeurs, stats,
// process, FAQ, formulaire multi-étapes, section signature, libellés nav.
// ════════════════════════════════════════════════════════════════════════════

const siteData = $json;
const prepData = $('Préparer Données').first().json;
const siteConfig = prepData.config || {};

console.log('🏢 Template SERVICE V12 SECTORS');

// ═══ PARSER GEMINI ═══
let content = {};
try {
  const geminiResponse = siteData.candidates?.[0]?.content?.parts?.[0]?.text || siteData.content?.[0]?.text || '';
  if (geminiResponse) {
    const cleanJson = geminiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = JSON.parse(jsonMatch[0]);
  }
} catch(e) { content = {}; }

let visionData = {};
try { visionData = $('Traiter Vision')?.first()?.json || {}; } catch(e) { visionData = {}; }

// ═══ UTILITAIRES ═══
const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) return clean.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  return phone;
};
const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const generateSlug = (str) => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const norm = (str) => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ═══ DONNÉES DE BASE ═══
const DATA = {
  name: prepData.name || prepData.company_name || 'Cabinet Conseil',
  city: prepData.city || prepData.ville || 'Paris',
  address: prepData.address || prepData.adresse_complete || '',
  phone: prepData.phone || prepData.telephone || '',
  phoneFmt: formatPhone(prepData.phone || prepData.telephone || ''),
  email: prepData.email || '',
  rating: Number(prepData.rating) || 4.8,
  reviews_count: prepData.reviews_count || prepData.total_avis || 0,
  reviews: prepData.reviews || [],
  mapsUrl: prepData.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((prepData.address || prepData.name || '') + ' ' + (prepData.city || ''))}`,
  photos: prepData.photos || [],
  categorized_photos: visionData.categorized_photos || {},
  horaires: prepData.horaires_formated || 'Lun-Ven : 9h-19h',
  slug: prepData.slug || generateSlug(prepData.name || 'cabinet'),
  category: prepData.category || prepData.categorie || prepData.google_type || prepData.sector?.name || '',
  types: [prepData.google_types, prepData.types].flat().filter(Boolean).join(' '),
  description: prepData.description || prepData.editorial_summary || ''
};
const phoneHref = DATA.phone ? 'tel:' + DATA.phone.replace(/\s/g, '') : '';

// ═══════════════════════════════════════════════════════════════════════════
// DÉTECTION DU SECTEUR (score par mots-clés sur nom + catégorie Google + desc)
// ═══════════════════════════════════════════════════════════════════════════

const SECTOR_KEYWORDS = {
  avocat:     ['avocat', 'juridique', 'droit', 'notaire', 'huissier', 'juriste', 'law', 'lawyer', 'legal', 'attorney', 'scp '],
  immobilier: ['immobili', 'immo', 'real estate', 'transaction', 'gestion locative', 'syndic', 'orpi', 'century', 'laforet', 'foncia', 'nexity', 'iad'],
  assurance:  ['assur', 'mutuelle', 'courtier', 'courtage', 'prevoyance', 'axa', 'allianz', 'maif', 'macif', 'generali', 'insurance'],
  comptable:  ['comptab', 'expert-compt', 'expertise compt', 'fiduciaire', 'audit', 'accounting', 'gestion fiscale', 'commissaire aux comptes'],
  architecte: ['architect', 'design', 'decor', 'amenagement', 'maitre d\'oeuvre', 'urbanisme', 'interior', 'agencement'],
  medical:    ['medecin', 'docteur', 'dr ', 'dr.', 'clinique', 'sante', 'kine', 'osteo', 'dentiste', 'orthodont', 'cabinet medical', 'infirmi', 'psycho', 'podolog', 'dermato', 'ophtalmo', 'pediatr', 'physio', 'chiropra', 'sage-femme', 'dieteticien', 'nutrition'],
  conseil:    ['conseil', 'consulting', 'consultant', 'strategie', 'coaching', 'coach', 'formation', 'management', 'rh ', 'ressources humaines', 'marketing', 'agence digitale', 'communication']
};

// sector.id est déjà résolu en amont par "CONFIG + SECTORS" (ex: avocat, notaire, courtier, immobilier…)
const UPSTREAM_SECTOR_MAP = {
  avocat: 'avocat', notaire: 'avocat', huissier: 'avocat', juriste: 'avocat',
  immobilier: 'immobilier', agence_immobiliere: 'immobilier', syndic: 'immobilier',
  courtier: 'assurance', assurance: 'assurance', assureur: 'assurance', mutuelle: 'assurance',
  comptable: 'comptable', expert_comptable: 'comptable', fiduciaire: 'comptable',
  architecte: 'architecte', decorateur: 'architecte', architecte_interieur: 'architecte',
  medecin: 'medical', dentiste: 'medical', kine: 'medical', osteopathe: 'medical', podologue: 'medical', psychologue: 'medical', infirmier: 'medical',
  conseil: 'conseil', consultant: 'conseil', coach: 'conseil', formation: 'conseil', formateur: 'conseil'
};

const detectSector = () => {
  const upstream = norm(prepData.sector?.id || '').replace(/[^a-z_]/g, '');
  if (UPSTREAM_SECTOR_MAP[upstream]) return UPSTREAM_SECTOR_MAP[upstream];
  const haystackStrong = norm(DATA.name + ' ' + DATA.category + ' ' + DATA.types);
  const haystackWeak = norm(DATA.description + ' ' + (content.sector || content.secteur || ''));
  const scores = {};
  for (const [key, words] of Object.entries(SECTOR_KEYWORDS)) {
    scores[key] = 0;
    for (const w of words) {
      if (haystackStrong.includes(w)) scores[key] += 3;
      if (haystackWeak.includes(w)) scores[key] += 1;
    }
  }
  const forced = norm(prepData.service_type || prepData.secteur_force || '');
  if (forced && SECTOR_KEYWORDS[forced]) return forced;
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'default';
};

const serviceType = detectSector();

// ═══════════════════════════════════════════════════════════════════════════
// CHAMPS DE FORMULAIRE RÉUTILISABLES
// ═══════════════════════════════════════════════════════════════════════════

const CONTACT_STEP = (extra = []) => ({
  title: 'Vos coordonnées',
  icon: 'fa-user',
  fields: [
    { name: 'nom', type: 'text', label: 'Nom', required: true, half: true },
    { name: 'prenom', type: 'text', label: 'Prénom', required: true, half: true },
    { name: 'telephone', type: 'tel', label: 'Téléphone', required: true, placeholder: '06 00 00 00 00' },
    { name: 'email', type: 'email', label: 'Email', required: true },
    ...extra
  ]
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTEURS — UNE SEULE SOURCE DE VÉRITÉ
// ═══════════════════════════════════════════════════════════════════════════

const SECTORS = {

  // ─────────────────────────────── AVOCAT ───────────────────────────────
  avocat: {
    label: 'Cabinet d\'avocats',
    icon: 'fa-scale-balanced',
    colors: { primary: '#334155', primaryDark: '#1e293b', accent: '#b45309', gradient: 'from-slate-700 to-slate-900', rgb: '51, 65, 85', tw: 'slate', accentTw: 'amber' },
    fonts: { display: 'Cormorant Garamond', body: 'Inter' },
    heroPhoto: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&q=80',
    nav: { about: 'Le Cabinet', services: 'Domaines', cta: 'Consultation' },
    hero: {
      title: 'Cabinet d\'Avocats',
      subtitle: 'La rigueur du droit, l\'écoute d\'un partenaire',
      desc: `Cabinet d'avocats à ${DATA.city}. Conseil, défense et représentation dans toutes vos démarches juridiques.`,
      badges: ['Confidentialité absolue', 'Honoraires transparents', 'Réponse sous 24h', 'Barreau inscrit']
    },
    about: {
      tag: 'Le cabinet', title: 'Un cabinet à votre <em>écoute</em>',
      text: `${DATA.name} conseille et défend particuliers et entreprises à ${DATA.city}. Chaque dossier est traité avec rigueur, stratégie et une communication claire sur les enjeux et les honoraires.`,
      text2: 'Nous privilégions la négociation quand elle sert vos intérêts et le contentieux quand il est nécessaire.'
    },
    servicesTag: 'Domaines d\'intervention',
    servicesTitle: 'Nos <em>domaines</em> de compétence',
    services: [
      { icon: 'fa-gavel', name: 'Droit pénal', desc: 'Défense, garde à vue, comparution immédiate, appel.', price: 'Sur devis' },
      { icon: 'fa-people-roof', name: 'Droit de la famille', desc: 'Divorce, garde d\'enfants, pension, succession.', price: 'Dès 150 €/h' },
      { icon: 'fa-briefcase', name: 'Droit du travail', desc: 'Licenciement, rupture conventionnelle, prud\'hommes.', price: 'Forfait possible' },
      { icon: 'fa-house', name: 'Droit immobilier', desc: 'Litiges bailleur/locataire, copropriété, construction.', price: 'Sur devis' },
      { icon: 'fa-building', name: 'Droit des affaires', desc: 'Contrats, contentieux commercial, recouvrement.', price: 'Abonnement dispo' },
      { icon: 'fa-car', name: 'Droit routier', desc: 'Permis, suspension, infractions, alcoolémie.', price: 'Dès 500 €' }
    ],
    values: [
      { icon: 'fa-user-shield', title: 'Confidentialité', desc: 'Secret professionnel et discrétion totale.' },
      { icon: 'fa-ear-listen', title: 'Écoute', desc: 'Comprendre votre situation avant d\'agir.' },
      { icon: 'fa-shield-halved', title: 'Combativité', desc: 'Défendre vos intérêts sans compromis.' },
      { icon: 'fa-bolt', title: 'Réactivité', desc: 'Réponse rapide, surtout en cas d\'urgence.' }
    ],
    stats: [
      { value: '15+', label: 'Ans de barreau', icon: 'fa-scale-balanced' },
      { value: '800+', label: 'Dossiers traités', icon: 'fa-folder-open' },
      { value: '92%', label: 'Issues favorables', icon: 'fa-trophy' },
      { value: '24h', label: 'Première réponse', icon: 'fa-bolt' }
    ],
    process: [
      { icon: 'fa-phone', title: 'Premier contact', desc: 'Échange gratuit pour évaluer votre situation.' },
      { icon: 'fa-file-signature', title: 'Convention d\'honoraires', desc: 'Devis clair et écrit avant tout engagement.' },
      { icon: 'fa-chess', title: 'Stratégie', desc: 'Analyse du dossier et plan d\'action.' },
      { icon: 'fa-landmark', title: 'Action', desc: 'Négociation ou procédure, avec suivi régulier.' }
    ],
    highlight: {
      tag: 'Honoraires', title: 'Des honoraires <em>transparents</em>',
      desc: 'Une convention d\'honoraires écrite est systématiquement établie. Vous savez toujours ce que vous payez.',
      items: [
        { icon: 'fa-comments', title: 'Consultation', text: 'Premier rendez-vous d\'évaluation' , value: 'Dès 80 €' },
        { icon: 'fa-clock', title: 'Au temps passé', text: 'Facturation horaire détaillée', value: 'Dès 150 €/h' },
        { icon: 'fa-file-contract', title: 'Forfait', text: 'Prix fixe pour procédures courantes', value: 'Sur devis' },
        { icon: 'fa-hand-holding-dollar', title: 'Aide juridictionnelle', text: 'Acceptée selon vos ressources', value: 'Sous conditions' }
      ]
    },
    faq: [
      { q: 'Combien coûte une consultation ?', a: 'Le premier échange téléphonique est gratuit. La consultation au cabinet est facturée selon la convention d\'honoraires établie au préalable.' },
      { q: 'Acceptez-vous l\'aide juridictionnelle ?', a: 'Oui, sous conditions de ressources. Nous vous aidons à constituer le dossier.' },
      { q: 'Que faire en cas de garde à vue ?', a: 'Contactez-nous immédiatement : vous avez droit à un avocat dès la première heure. Notre ligne est prioritaire pour les urgences pénales.' },
      { q: 'Intervenez-vous en dehors de ' + DATA.city + ' ?', a: 'Oui, nous plaidons devant toutes les juridictions françaises. Les frais de déplacement sont précisés dans la convention.' },
      { q: 'Combien de temps dure une procédure ?', a: 'Cela dépend de la juridiction et de la complexité. Nous vous donnons une estimation réaliste dès l\'analyse du dossier.' }
    ],
    form: {
      title: 'Consultation juridique', subtitle: 'Décrivez votre situation en 3 étapes', cta: 'Demander une consultation',
      steps: [
        { title: 'Votre situation', icon: 'fa-scale-balanced', fields: [
          { name: 'domaine', type: 'cards', label: 'Domaine juridique', required: true, options: [
            { value: 'penal', label: 'Pénal', icon: 'fa-gavel', desc: 'Défense, garde à vue' },
            { value: 'famille', label: 'Famille', icon: 'fa-people-roof', desc: 'Divorce, garde, succession' },
            { value: 'travail', label: 'Travail', icon: 'fa-briefcase', desc: 'Licenciement, prud\'hommes' },
            { value: 'immobilier', label: 'Immobilier', icon: 'fa-house', desc: 'Bail, copropriété' },
            { value: 'affaires', label: 'Affaires', icon: 'fa-building', desc: 'Contrats, commercial' },
            { value: 'autre', label: 'Autre', icon: 'fa-ellipsis', desc: 'Autre domaine' }
          ]},
          { name: 'urgence', type: 'toggle', label: 'Situation urgente ?', options: ['Non', 'Oui, urgence'] }
        ]},
        { title: 'Détails', icon: 'fa-file-lines', fields: [
          { name: 'description', type: 'textarea', label: 'Décrivez brièvement votre situation', placeholder: 'Les faits, les dates clés, ce que vous attendez...', rows: 5 },
          { name: 'procedure', type: 'toggle', label: 'Une procédure est-elle déjà engagée ?', options: ['Non', 'Oui'] },
          { name: 'rdv_pref', type: 'select', label: 'Préférence de rendez-vous', options: ['Au cabinet', 'Visioconférence', 'Par téléphone', 'Sans préférence'] }
        ]},
        CONTACT_STEP()
      ]
    }
  },

  // ─────────────────────────────── IMMOBILIER ───────────────────────────────
  immobilier: {
    label: 'Agence immobilière',
    icon: 'fa-building',
    colors: { primary: '#059669', primaryDark: '#047857', accent: '#0f766e', gradient: 'from-emerald-600 to-teal-600', rgb: '5, 150, 105', tw: 'emerald', accentTw: 'teal' },
    fonts: { display: 'Playfair Display', body: 'Plus Jakarta Sans' },
    heroPhoto: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    nav: { about: 'L\'Agence', services: 'Services', cta: 'Estimation gratuite' },
    hero: {
      title: 'Agence Immobilière',
      subtitle: 'Vendre, acheter, louer : votre projet entre bonnes mains',
      desc: `Agence immobilière à ${DATA.city}. Estimation gratuite, vente, location et gestion locative avec un accompagnement local.`,
      badges: ['Estimation gratuite', 'Connaissance du quartier', 'Honoraires clairs', 'Suivi personnalisé']
    },
    about: {
      tag: 'L\'agence', title: 'Ancrés à <em>' + DATA.city + '</em>',
      text: `${DATA.name} connaît chaque rue, chaque immeuble et les prix réels du marché de ${DATA.city}. Cette expertise locale fait la différence pour vendre au bon prix et dans les meilleurs délais.`,
      text2: 'Un interlocuteur unique vous accompagne de l\'estimation jusqu\'à la signature chez le notaire.'
    },
    servicesTag: 'Nos services',
    servicesTitle: 'Un accompagnement <em>complet</em>',
    services: [
      { icon: 'fa-tag', name: 'Vente', desc: 'Estimation, photos pro, diffusion, visites, négociation.', price: 'Honoraires dès 3%' },
      { icon: 'fa-magnifying-glass-location', name: 'Recherche de bien', desc: 'Sélection sur mesure selon vos critères et budget.', price: 'Gratuit acheteur' },
      { icon: 'fa-key', name: 'Location', desc: 'Mise en location, sélection des dossiers, bail.', price: 'Selon barème' },
      { icon: 'fa-list-check', name: 'Gestion locative', desc: 'Loyers, quittances, entretien, contentieux.', price: 'Dès 5% HT' },
      { icon: 'fa-chart-line', name: 'Estimation', desc: 'Valeur réelle basée sur les ventes récentes.', price: 'Gratuit' },
      { icon: 'fa-coins', name: 'Investissement', desc: 'Rendement, fiscalité, sélection de biens.', price: 'Sur RDV' }
    ],
    values: [
      { icon: 'fa-map-location-dot', title: 'Expertise locale', desc: 'Nous vivons et travaillons ici.' },
      { icon: 'fa-eye', title: 'Transparence', desc: 'Honoraires et prix expliqués clairement.' },
      { icon: 'fa-bolt', title: 'Réactivité', desc: 'Réponse à chaque contact dans la journée.' },
      { icon: 'fa-handshake', title: 'Accompagnement', desc: 'Présents à chaque étape, jusqu\'aux clés.' }
    ],
    stats: [
      { value: '350+', label: 'Biens vendus', icon: 'fa-house-circle-check' },
      { value: '45j', label: 'Délai moyen de vente', icon: 'fa-calendar-check' },
      { value: '98%', label: 'Prix de vente vs estimation', icon: 'fa-bullseye' },
      { value: '4.8/5', label: 'Note clients', icon: 'fa-star' }
    ],
    process: [
      { icon: 'fa-house-chimney', title: 'Estimation', desc: 'Visite et analyse du marché local, gratuite.' },
      { icon: 'fa-camera', title: 'Mise en valeur', desc: 'Photos pro, visite virtuelle, annonce optimisée.' },
      { icon: 'fa-people-group', title: 'Visites', desc: 'Acheteurs qualifiés, comptes rendus après chaque visite.' },
      { icon: 'fa-file-signature', title: 'Signature', desc: 'Négociation, compromis, suivi jusqu\'au notaire.' }
    ],
    highlight: {
      tag: 'Estimation', title: 'Combien vaut <em>votre bien</em> ?',
      desc: 'Une estimation fiable ne se fait pas en ligne : elle se fait sur place, avec la connaissance des ventes réelles du quartier.',
      items: [
        { icon: 'fa-location-dot', title: 'Visite sur place', text: 'Analyse du bien, de l\'immeuble et de l\'environnement', value: 'Gratuit' },
        { icon: 'fa-chart-simple', title: 'Comparables réels', text: 'Basée sur les ventes signées récemment', value: 'Précis' },
        { icon: 'fa-file-pdf', title: 'Rapport écrit', text: 'Dossier d\'estimation détaillé sous 48h', value: 'Sans engagement' },
        { icon: 'fa-lightbulb', title: 'Conseils', text: 'Travaux à prévoir, stratégie de vente', value: 'Inclus' }
      ]
    },
    faq: [
      { q: 'L\'estimation est-elle vraiment gratuite ?', a: 'Oui, sans engagement. Nous nous déplaçons, analysons le bien et vous remettons un rapport écrit.' },
      { q: 'Quels sont vos honoraires ?', a: 'Nos honoraires sont dégressifs selon le prix de vente et affichés en agence. Ils ne sont dus qu\'à la signature de l\'acte authentique.' },
      { q: 'Combien de temps pour vendre ?', a: 'En moyenne 45 jours à ' + DATA.city + ' pour un bien au prix du marché. Nous vous donnons une estimation réaliste dès le départ.' },
      { q: 'Faut-il un mandat exclusif ?', a: 'Nous proposons les deux. L\'exclusivité permet un investissement marketing plus important et des délais souvent plus courts.' },
      { q: 'Gérez-vous les locations ?', a: 'Oui : recherche de locataire, état des lieux, gestion des loyers et du quotidien.' }
    ],
    form: {
      title: 'Votre projet immobilier', subtitle: 'Estimation gratuite en 3 étapes', cta: 'Obtenir mon estimation',
      steps: [
        { title: 'Votre projet', icon: 'fa-house', fields: [
          { name: 'projet', type: 'cards', label: 'Que souhaitez-vous faire ?', required: true, options: [
            { value: 'vendre', label: 'Vendre', icon: 'fa-tag', desc: 'Estimer et vendre' },
            { value: 'acheter', label: 'Acheter', icon: 'fa-key', desc: 'Trouver un bien' },
            { value: 'louer', label: 'Louer', icon: 'fa-handshake', desc: 'Mettre en location' },
            { value: 'gestion', label: 'Gestion', icon: 'fa-list-check', desc: 'Confier la gestion' },
            { value: 'estimer', label: 'Estimer', icon: 'fa-chart-line', desc: 'Connaître la valeur' },
            { value: 'investir', label: 'Investir', icon: 'fa-coins', desc: 'Locatif, rendement' }
          ]},
          { name: 'delai', type: 'select', label: 'Votre horizon', options: ['Dès que possible', 'Dans les 3 mois', 'Dans les 6 mois', 'Je me renseigne'] }
        ]},
        { title: 'Le bien', icon: 'fa-building', fields: [
          { name: 'type_bien', type: 'select', label: 'Type de bien', options: ['Appartement', 'Maison', 'Terrain', 'Local commercial', 'Immeuble', 'Parking / Garage', 'Autre'] },
          { name: 'surface', type: 'number', label: 'Surface (m²)', placeholder: 'Ex : 75', half: true },
          { name: 'pieces', type: 'select', label: 'Pièces', options: ['Studio', '2 pièces', '3 pièces', '4 pièces', '5 pièces et +'], half: true },
          { name: 'localisation', type: 'text', label: 'Adresse ou quartier', placeholder: 'Ex : ' + DATA.city + ' centre' },
          { name: 'etat', type: 'toggle', label: 'État général', options: ['Bon état', 'Travaux à prévoir', 'Neuf / Rénové'] }
        ]},
        CONTACT_STEP()
      ]
    }
  },

  // ─────────────────────────────── ASSURANCE ───────────────────────────────
  assurance: {
    label: 'Cabinet d\'assurances',
    icon: 'fa-shield-halved',
    colors: { primary: '#0284c7', primaryDark: '#0369a1', accent: '#1d4ed8', gradient: 'from-sky-600 to-blue-700', rgb: '2, 132, 199', tw: 'sky', accentTw: 'blue' },
    fonts: { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    heroPhoto: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
    nav: { about: 'Le Cabinet', services: 'Nos contrats', cta: 'Devis gratuit' },
    hero: {
      title: 'Courtier en Assurances',
      subtitle: 'Protéger ce qui compte, au juste prix',
      desc: `Courtier en assurances à ${DATA.city}. Auto, habitation, santé, pro : nous comparons les meilleurs contrats pour vous.`,
      badges: ['Courtier indépendant', 'Comparaison de 20+ assureurs', 'Devis sous 24h', 'Accompagnement sinistre']
    },
    about: {
      tag: 'Le cabinet', title: 'Un courtier <em>indépendant</em>',
      text: `${DATA.name} travaille avec plusieurs compagnies d'assurance, sans lien d'exclusivité. Nous comparons, négocions et vous proposons le contrat réellement adapté à votre situation.`,
      text2: 'En cas de sinistre, vous n\'êtes pas seul : nous gérons la déclaration et le suivi avec l\'assureur.'
    },
    servicesTag: 'Nos contrats',
    servicesTitle: 'Une couverture <em>sur mesure</em>',
    services: [
      { icon: 'fa-car', name: 'Auto & Moto', desc: 'Tiers, tous risques, jeunes conducteurs, malus.', price: 'Dès 25 €/mois' },
      { icon: 'fa-house-chimney', name: 'Habitation', desc: 'Propriétaire, locataire, résidence secondaire.', price: 'Dès 12 €/mois' },
      { icon: 'fa-heart-pulse', name: 'Santé & Mutuelle', desc: 'Complémentaire individuelle, famille, senior, TNS.', price: 'Dès 30 €/mois' },
      { icon: 'fa-umbrella', name: 'Prévoyance', desc: 'Arrêt de travail, invalidité, décès.', price: 'Sur devis' },
      { icon: 'fa-briefcase', name: 'Professionnels', desc: 'RC Pro, multirisque, flotte, décennale.', price: 'Sur devis' },
      { icon: 'fa-piggy-bank', name: 'Épargne & Retraite', desc: 'Assurance vie, PER, transmission.', price: 'Frais réduits' }
    ],
    values: [
      { icon: 'fa-scale-unbalanced-flip', title: 'Indépendance', desc: 'Aucune exclusivité avec un assureur.' },
      { icon: 'fa-code-compare', title: 'Comparaison', desc: 'Plusieurs devis pour chaque besoin.' },
      { icon: 'fa-user-check', title: 'Conseil', desc: 'Le bon niveau de garantie, pas plus.' },
      { icon: 'fa-life-ring', title: 'Suivi sinistre', desc: 'Nous gérons la relation assureur.' }
    ],
    stats: [
      { value: '20+', label: 'Compagnies partenaires', icon: 'fa-building-shield' },
      { value: '2 500+', label: 'Contrats gérés', icon: 'fa-file-shield' },
      { value: '-25%', label: 'Économie moyenne', icon: 'fa-arrow-trend-down' },
      { value: '24h', label: 'Devis sous', icon: 'fa-bolt' }
    ],
    process: [
      { icon: 'fa-clipboard-question', title: 'Bilan', desc: 'Analyse de vos contrats et besoins réels.' },
      { icon: 'fa-code-compare', title: 'Comparaison', desc: 'Consultation de nos compagnies partenaires.' },
      { icon: 'fa-file-circle-check', title: 'Proposition', desc: 'Devis clairs, garanties expliquées.' },
      { icon: 'fa-arrows-rotate', title: 'Résiliation & suivi', desc: 'Nous gérons le changement et le suivi annuel.' }
    ],
    highlight: {
      tag: 'Bilan gratuit', title: 'Payez-vous <em>trop cher</em> ?',
      desc: 'La plupart de nos nouveaux clients économisent en moyenne 25% à garanties égales. Apportez vos contrats, on compare.',
      items: [
        { icon: 'fa-file-invoice', title: 'Audit de vos contrats', text: 'Garanties, franchises, doublons', value: 'Gratuit' },
        { icon: 'fa-code-compare', title: 'Comparatif', text: 'Plusieurs assureurs consultés', value: 'Sous 24h' },
        { icon: 'fa-right-left', title: 'Changement simplifié', text: 'Résiliation prise en charge (loi Hamon)', value: 'Inclus' },
        { icon: 'fa-headset', title: 'Un seul interlocuteur', text: 'Pour tous vos contrats et sinistres', value: 'Toujours' }
      ]
    },
    faq: [
      { q: 'Un courtier coûte-t-il plus cher ?', a: 'Non. Le courtier est rémunéré par les compagnies d\'assurance. Notre conseil et nos devis sont gratuits pour vous.' },
      { q: 'Puis-je changer d\'assurance en cours d\'année ?', a: 'Oui pour l\'auto, l\'habitation et la mutuelle après un an de contrat (loi Hamon / résiliation infra-annuelle). Nous gérons les démarches.' },
      { q: 'Que se passe-t-il en cas de sinistre ?', a: 'Vous nous appelez. Nous déclarons le sinistre, suivons l\'expertise et défendons vos intérêts auprès de l\'assureur.' },
      { q: 'Assurez-vous les professionnels ?', a: 'Oui : RC Pro, multirisque, décennale, flotte automobile, mutuelle d\'entreprise et prévoyance TNS.' },
      { q: 'Combien de temps pour un devis ?', a: 'En général sous 24h ouvrées, une fois vos informations reçues.' }
    ],
    form: {
      title: 'Devis assurance', subtitle: 'Comparez en 3 étapes', cta: 'Recevoir mon devis gratuit',
      steps: [
        { title: 'Type d\'assurance', icon: 'fa-shield-halved', fields: [
          { name: 'type_assurance', type: 'cards', label: 'Quelle assurance ?', required: true, options: [
            { value: 'auto', label: 'Auto / Moto', icon: 'fa-car', desc: 'Véhicule' },
            { value: 'habitation', label: 'Habitation', icon: 'fa-house-chimney', desc: 'Maison, appartement' },
            { value: 'sante', label: 'Santé', icon: 'fa-heart-pulse', desc: 'Mutuelle' },
            { value: 'prevoyance', label: 'Prévoyance', icon: 'fa-umbrella', desc: 'Arrêt, décès' },
            { value: 'pro', label: 'Professionnelle', icon: 'fa-briefcase', desc: 'RC Pro, locaux' },
            { value: 'epargne', label: 'Épargne', icon: 'fa-piggy-bank', desc: 'Vie, retraite' }
          ]}
        ]},
        { title: 'Votre situation', icon: 'fa-clipboard-list', fields: [
          { name: 'situation', type: 'select', label: 'Vous êtes', options: ['Particulier', 'Professionnel / Entreprise', 'Association'] },
          { name: 'assure_actuel', type: 'toggle', label: 'Déjà assuré ailleurs ?', options: ['Non', 'Oui, je veux comparer'] },
          { name: 'budget', type: 'select', label: 'Budget mensuel actuel ou souhaité', options: ['< 30 €', '30-50 €', '50-100 €', '100-200 €', '> 200 €', 'Je ne sais pas'] },
          { name: 'precisions', type: 'textarea', label: 'Précisions', placeholder: 'Ex : véhicule, nombre de personnes à couvrir, activité pro...', rows: 3 }
        ]},
        CONTACT_STEP()
      ]
    }
  },

  // ─────────────────────────────── COMPTABLE ───────────────────────────────
  comptable: {
    label: 'Cabinet d\'expertise comptable',
    icon: 'fa-calculator',
    colors: { primary: '#4f46e5', primaryDark: '#4338ca', accent: '#7c3aed', gradient: 'from-indigo-600 to-violet-600', rgb: '79, 70, 229', tw: 'indigo', accentTw: 'violet' },
    fonts: { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    heroPhoto: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    nav: { about: 'Le Cabinet', services: 'Missions', cta: 'Devis gratuit' },
    hero: {
      title: 'Expert-Comptable',
      subtitle: 'Des chiffres justes, des décisions éclairées',
      desc: `Cabinet d'expertise comptable à ${DATA.city}. Comptabilité, fiscalité, paie et conseil pour TPE, PME, indépendants et créateurs.`,
      badges: ['Inscrit à l\'Ordre', 'Tarifs forfaitaires', 'Outils 100% en ligne', 'Interlocuteur dédié']
    },
    about: {
      tag: 'Le cabinet', title: 'Bien plus que la <em>tenue des comptes</em>',
      text: `${DATA.name} accompagne les dirigeants de ${DATA.city} et sa région : comptabilité, déclarations, paie, mais surtout conseil pour piloter et développer l'entreprise.`,
      text2: 'Outils digitaux, échanges dématérialisés et un interlocuteur unique qui connaît votre dossier.'
    },
    servicesTag: 'Nos missions',
    servicesTitle: 'Un accompagnement <em>360°</em>',
    services: [
      { icon: 'fa-book', name: 'Tenue comptable', desc: 'Saisie, révision, bilan et liasse fiscale.', price: 'Dès 120 €/mois' },
      { icon: 'fa-file-invoice', name: 'Fiscalité', desc: 'TVA, IS, CFE, optimisation et contrôle fiscal.', price: 'Inclus' },
      { icon: 'fa-users', name: 'Social & Paie', desc: 'Bulletins, DSN, contrats, ruptures.', price: 'Dès 22 €/bulletin' },
      { icon: 'fa-chart-pie', name: 'Pilotage', desc: 'Tableaux de bord, trésorerie, prévisionnel.', price: 'Sur devis' },
      { icon: 'fa-rocket', name: 'Création d\'entreprise', desc: 'Choix du statut, statuts, immatriculation.', price: 'Forfait dès 490 €' },
      { icon: 'fa-magnifying-glass-chart', name: 'Audit & Évaluation', desc: 'Commissariat aux comptes, valorisation, cession.', price: 'Sur devis' }
    ],
    values: [
      { icon: 'fa-ruler-combined', title: 'Rigueur', desc: 'Zéro approximation, délais respectés.' },
      { icon: 'fa-phone-volume', title: 'Disponibilité', desc: 'Un interlocuteur qui répond.' },
      { icon: 'fa-lightbulb', title: 'Proactivité', desc: 'On anticipe, on vous alerte.' },
      { icon: 'fa-lock', title: 'Confidentialité', desc: 'Vos données sont protégées.' }
    ],
    stats: [
      { value: '300+', label: 'Entreprises clientes', icon: 'fa-building' },
      { value: '20+', label: 'Ans d\'expertise', icon: 'fa-award' },
      { value: '100%', label: 'Déclarations dans les délais', icon: 'fa-calendar-check' },
      { value: '48h', label: 'Réponse à vos questions', icon: 'fa-reply' }
    ],
    process: [
      { icon: 'fa-comments', title: 'Diagnostic', desc: 'Compréhension de votre activité et de vos besoins.' },
      { icon: 'fa-file-signature', title: 'Lettre de mission', desc: 'Périmètre et honoraires fixés par écrit.' },
      { icon: 'fa-laptop', title: 'Mise en place', desc: 'Outils connectés, reprise du dossier.' },
      { icon: 'fa-chart-line', title: 'Suivi', desc: 'Points réguliers et conseils toute l\'année.' }
    ],
    highlight: {
      tag: 'Nos forfaits', title: 'Des tarifs <em>clairs</em>, sans surprise',
      desc: 'Un abonnement mensuel adapté à votre structure. Tout est inclus : tenue, déclarations, bilan et conseil.',
      items: [
        { icon: 'fa-user', title: 'Indépendant / Micro', text: 'Déclarations, suivi, conseil', value: 'Dès 69 €/mois' },
        { icon: 'fa-store', title: 'TPE (EURL, SASU)', text: 'Comptabilité complète + bilan', value: 'Dès 120 €/mois' },
        { icon: 'fa-building', title: 'PME avec salariés', text: 'Compta + paie + pilotage', value: 'Dès 250 €/mois' },
        { icon: 'fa-rocket', title: 'Création', text: 'Statuts, immatriculation, prévisionnel', value: 'Forfait 490 €' }
      ]
    },
    faq: [
      { q: 'Comment sont calculés vos honoraires ?', a: 'Par forfait mensuel, selon votre statut, votre volume d\'opérations et les services souhaités. Tout est écrit dans la lettre de mission.' },
      { q: 'Puis-je changer d\'expert-comptable en cours d\'année ?', a: 'Oui, à tout moment. Nous gérons la reprise du dossier avec votre ancien cabinet.' },
      { q: 'Faut-il venir au cabinet ?', a: 'Non. Nos outils en ligne permettent de tout gérer à distance, mais nous vous recevons avec plaisir à ' + DATA.city + '.' },
      { q: 'Accompagnez-vous les créations d\'entreprise ?', a: 'Oui : choix du statut, rédaction des statuts, immatriculation, prévisionnel et dossier bancaire.' },
      { q: 'Gérez-vous la paie ?', a: 'Oui : bulletins, DSN, contrats de travail, entrées/sorties, et conseil en droit social.' }
    ],
    form: {
      title: 'Devis comptabilité', subtitle: 'Obtenez un tarif en 3 étapes', cta: 'Recevoir mon devis',
      steps: [
        { title: 'Votre entreprise', icon: 'fa-building', fields: [
          { name: 'statut', type: 'cards', label: 'Statut juridique', required: true, options: [
            { value: 'micro', label: 'Micro / Auto', icon: 'fa-user', desc: 'Micro-entreprise' },
            { value: 'ei', label: 'EI / Profession libérale', icon: 'fa-user-doctor', desc: 'BNC, BIC' },
            { value: 'eurl', label: 'EURL / SARL', icon: 'fa-store', desc: 'Responsabilité limitée' },
            { value: 'sas', label: 'SAS / SASU', icon: 'fa-landmark', desc: 'Par actions' },
            { value: 'sci', label: 'SCI', icon: 'fa-house', desc: 'Immobilier' },
            { value: 'creation', label: 'En création', icon: 'fa-rocket', desc: 'Je crée mon entreprise' }
          ]}
        ]},
        { title: 'Vos besoins', icon: 'fa-clipboard-list', fields: [
          { name: 'ca', type: 'select', label: 'Chiffre d\'affaires annuel', options: ['< 50 000 €', '50-150 000 €', '150-500 000 €', '500 000 € - 1M €', '> 1M €', 'En création'] },
          { name: 'salaries', type: 'select', label: 'Nombre de salariés', options: ['0 (dirigeant seul)', '1-5 salariés', '6-20 salariés', '> 20 salariés'] },
          { name: 'besoins', type: 'multiselect', label: 'Services souhaités', options: ['Comptabilité', 'Déclarations fiscales', 'Paie / Social', 'Pilotage / Conseil', 'Création', 'Juridique annuel'] },
          { name: 'situation', type: 'toggle', label: 'Vous avez déjà un comptable ?', options: ['Non', 'Oui, je veux changer'] }
        ]},
        CONTACT_STEP([{ name: 'entreprise', type: 'text', label: 'Nom de l\'entreprise', placeholder: 'Optionnel' }])
      ]
    }
  },

  // ─────────────────────────────── ARCHITECTE ───────────────────────────────
  architecte: {
    label: 'Agence d\'architecture',
    icon: 'fa-compass-drafting',
    colors: { primary: '#0f172a', primaryDark: '#020617', accent: '#d97706', gradient: 'from-slate-900 to-amber-700', rgb: '217, 119, 6', tw: 'amber', accentTw: 'stone' },
    fonts: { display: 'Cormorant Garamond', body: 'Inter' },
    heroPhoto: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80',
    nav: { about: 'L\'Atelier', services: 'Prestations', cta: 'Parler de votre projet' },
    hero: {
      title: 'Architecte & Design',
      subtitle: 'Des espaces pensés pour ceux qui les vivent',
      desc: `Agence d'architecture à ${DATA.city}. Construction, rénovation, extension et architecture d'intérieur, de l'esquisse à la livraison.`,
      badges: ['Inscrit à l\'Ordre', 'Permis de construire', 'Suivi de chantier', 'Conception 3D']
    },
    about: {
      tag: 'L\'atelier', title: 'Concevoir <em>juste</em>',
      text: `${DATA.name} conçoit des projets sur mesure à ${DATA.city} : maisons, rénovations, extensions, espaces professionnels. Chaque projet part de votre manière de vivre, de la lumière et du lieu.`,
      text2: 'Nous assurons la maîtrise d\'œuvre complète : conception, autorisations, consultation des entreprises et suivi de chantier.'
    },
    servicesTag: 'Nos prestations',
    servicesTitle: 'De l\'esquisse à la <em>livraison</em>',
    services: [
      { icon: 'fa-house-chimney', name: 'Construction neuve', desc: 'Maison individuelle, conception bioclimatique.', price: '% du montant travaux' },
      { icon: 'fa-hammer', name: 'Rénovation', desc: 'Réhabilitation, restructuration, mise aux normes.', price: 'Dès 8% travaux' },
      { icon: 'fa-expand', name: 'Extension & Surélévation', desc: 'Gagner des m² en harmonie avec l\'existant.', price: 'Sur devis' },
      { icon: 'fa-couch', name: 'Architecture d\'intérieur', desc: 'Agencement, matériaux, lumière, mobilier.', price: 'Dès 90 €/m²' },
      { icon: 'fa-file-signature', name: 'Permis de construire', desc: 'Dossier complet, déclaration préalable.', price: 'Forfait dès 1 500 €' },
      { icon: 'fa-helmet-safety', name: 'Suivi de chantier', desc: 'Consultation entreprises, direction des travaux.', price: 'Inclus mission complète' }
    ],
    values: [
      { icon: 'fa-pen-ruler', title: 'Sur mesure', desc: 'Aucun projet ne ressemble à un autre.' },
      { icon: 'fa-sun', title: 'Lumière & matière', desc: 'Des espaces sains et lumineux.' },
      { icon: 'fa-leaf', title: 'Durabilité', desc: 'Matériaux et conception responsables.' },
      { icon: 'fa-coins', title: 'Maîtrise des coûts', desc: 'Budget tenu, sans surprise.' }
    ],
    stats: [
      { value: '120+', label: 'Projets livrés', icon: 'fa-building' },
      { value: '15+', label: 'Ans d\'expérience', icon: 'fa-award' },
      { value: '100%', label: 'Permis obtenus', icon: 'fa-file-circle-check' },
      { value: '±5%', label: 'Écart budget moyen', icon: 'fa-bullseye' }
    ],
    process: [
      { icon: 'fa-comments', title: 'Écoute', desc: 'Vos usages, vos envies, votre budget, le lieu.' },
      { icon: 'fa-pen-ruler', title: 'Esquisse', desc: 'Premières intentions, plans et vues 3D.' },
      { icon: 'fa-file-signature', title: 'Autorisations', desc: 'Permis de construire, déclaration préalable.' },
      { icon: 'fa-helmet-safety', title: 'Chantier', desc: 'Consultation des entreprises et suivi jusqu\'à la réception.' }
    ],
    highlight: {
      tag: 'Réalisations', title: 'Nos derniers <em>projets</em>',
      desc: 'Une sélection de projets récents : chaque réponse est unique, adaptée au site et à ses habitants.',
      gallery: true,
      items: [
        { icon: 'fa-house', title: 'Maison contemporaine', text: 'Construction neuve · 160 m²', value: DATA.city },
        { icon: 'fa-hammer', title: 'Rénovation d\'appartement', text: 'Restructuration complète · 85 m²', value: 'Centre-ville' },
        { icon: 'fa-expand', title: 'Extension bois', text: 'Surélévation · +45 m²', value: 'Périphérie' },
        { icon: 'fa-store', title: 'Local professionnel', text: 'Aménagement intérieur · 120 m²', value: DATA.city }
      ]
    },
    faq: [
      { q: 'Un architecte est-il obligatoire ?', a: 'Oui dès que la surface de plancher dépasse 150 m², ou pour toute construction par une société. En dessous, c\'est fortement recommandé pour la qualité et la valeur du projet.' },
      { q: 'Combien coûte un architecte ?', a: 'Pour une mission complète, entre 8 et 12% du montant des travaux. Des missions partielles (permis, esquisse) sont proposées au forfait.' },
      { q: 'Combien de temps dure un projet ?', a: 'Comptez 3 à 6 mois de conception et d\'autorisations, puis 6 à 12 mois de chantier selon l\'ampleur.' },
      { q: 'Suivez-vous le chantier ?', a: 'Oui, en mission complète : nous consultons les entreprises, dirigeons les travaux et assistons à la réception.' },
      { q: 'Faites-vous de l\'architecture d\'intérieur seule ?', a: 'Oui : agencement, choix des matériaux, éclairage, mobilier sur mesure, sans travaux structurels.' }
    ],
    form: {
      title: 'Votre projet', subtitle: 'Parlons-en en 3 étapes', cta: 'Envoyer mon projet',
      steps: [
        { title: 'Le projet', icon: 'fa-compass-drafting', fields: [
          { name: 'type_projet', type: 'cards', label: 'Type de projet', required: true, options: [
            { value: 'construction', label: 'Construction', icon: 'fa-house-chimney', desc: 'Neuf' },
            { value: 'renovation', label: 'Rénovation', icon: 'fa-hammer', desc: 'Existant' },
            { value: 'extension', label: 'Extension', icon: 'fa-expand', desc: 'Agrandir' },
            { value: 'interieur', label: 'Intérieur', icon: 'fa-couch', desc: 'Agencement, déco' },
            { value: 'permis', label: 'Permis seul', icon: 'fa-file-signature', desc: 'Autorisations' },
            { value: 'pro', label: 'Professionnel', icon: 'fa-store', desc: 'Bureaux, commerce' }
          ]}
        ]},
        { title: 'Détails', icon: 'fa-ruler-combined', fields: [
          { name: 'surface', type: 'number', label: 'Surface concernée (m²)', placeholder: 'Ex : 120', half: true },
          { name: 'budget', type: 'select', label: 'Budget travaux', options: ['< 50 000 €', '50-100 000 €', '100-200 000 €', '200-400 000 €', '> 400 000 €', 'À définir'], half: true },
          { name: 'localisation', type: 'text', label: 'Localisation du projet', placeholder: 'Ville ou adresse' },
          { name: 'delai', type: 'select', label: 'Démarrage souhaité', options: ['Dès que possible', 'Dans 3-6 mois', 'Dans 6-12 mois', 'Je me renseigne'] },
          { name: 'description', type: 'textarea', label: 'Décrivez votre projet', placeholder: 'Vos envies, contraintes, l\'existant...', rows: 4 }
        ]},
        CONTACT_STEP()
      ]
    }
  },

  // ─────────────────────────────── MEDICAL ───────────────────────────────
  medical: {
    label: 'Cabinet médical',
    icon: 'fa-stethoscope',
    colors: { primary: '#0d9488', primaryDark: '#0f766e', accent: '#0891b2', gradient: 'from-teal-600 to-cyan-600', rgb: '13, 148, 136', tw: 'teal', accentTw: 'cyan' },
    fonts: { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    heroPhoto: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    nav: { about: 'Le Cabinet', services: 'Soins', cta: 'Prendre rendez-vous' },
    hero: {
      title: 'Cabinet Médical',
      subtitle: 'Des soins attentifs, un suivi humain',
      desc: `Cabinet médical à ${DATA.city}. Consultations, suivi et soins dans un cadre accueillant. Prise de rendez-vous rapide.`,
      badges: ['Conventionné', 'Carte Vitale acceptée', 'Accès PMR', 'Rendez-vous rapides']
    },
    about: {
      tag: 'Le cabinet', title: 'Prendre <em>soin</em>, vraiment',
      text: `${DATA.name} accueille ses patients à ${DATA.city} dans un cabinet moderne et accessible. Chaque consultation prend le temps nécessaire pour écouter, expliquer et soigner.`,
      text2: 'Nous travaillons en réseau avec les spécialistes et établissements de la région pour assurer une prise en charge coordonnée.'
    },
    servicesTag: 'Nos soins',
    servicesTitle: 'Une prise en charge <em>complète</em>',
    services: [
      { icon: 'fa-user-doctor', name: 'Consultation', desc: 'Examen, diagnostic, prescription, orientation.', price: 'Secteur 1' },
      { icon: 'fa-notes-medical', name: 'Suivi & Prévention', desc: 'Bilans, vaccinations, maladies chroniques.', price: 'Conventionné' },
      { icon: 'fa-hand-holding-medical', name: 'Soins & Rééducation', desc: 'Actes techniques, séances, protocoles.', price: 'Sur prescription' },
      { icon: 'fa-baby', name: 'Enfants & Famille', desc: 'Suivi pédiatrique, certificats, carnet de santé.', price: 'Conventionné' },
      { icon: 'fa-video', name: 'Téléconsultation', desc: 'Consultation vidéo pour les suivis simples.', price: 'Remboursée' },
      { icon: 'fa-file-medical', name: 'Certificats & Bilans', desc: 'Sport, aptitude, bilans de santé.', price: 'Selon acte' }
    ],
    values: [
      { icon: 'fa-ear-listen', title: 'Écoute', desc: 'Le temps d\'expliquer et de comprendre.' },
      { icon: 'fa-user-shield', title: 'Confidentialité', desc: 'Secret médical absolu.' },
      { icon: 'fa-clock', title: 'Ponctualité', desc: 'Respect des horaires de rendez-vous.' },
      { icon: 'fa-hands-holding-child', title: 'Bienveillance', desc: 'Pour chaque patient, à chaque âge.' }
    ],
    stats: [
      { value: '3 000+', label: 'Patients suivis', icon: 'fa-users' },
      { value: '48h', label: 'Délai de rendez-vous', icon: 'fa-calendar-check' },
      { value: '100%', label: 'Conventionné', icon: 'fa-shield-heart' },
      { value: '4.8/5', label: 'Satisfaction patients', icon: 'fa-star' }
    ],
    process: [
      { icon: 'fa-calendar-plus', title: 'Rendez-vous', desc: 'En ligne, par téléphone ou via le formulaire.' },
      { icon: 'fa-clipboard-list', title: 'Accueil', desc: 'Dossier patient, carte Vitale, mutuelle.' },
      { icon: 'fa-stethoscope', title: 'Consultation', desc: 'Examen, explications, plan de soins.' },
      { icon: 'fa-arrows-rotate', title: 'Suivi', desc: 'Compte-rendu, ordonnance, orientation si besoin.' }
    ],
    highlight: {
      tag: 'Infos pratiques', title: 'Votre <em>venue</em> au cabinet',
      desc: 'Tout ce qu\'il faut savoir avant votre première consultation.',
      items: [
        { icon: 'fa-id-card', title: 'À apporter', text: 'Carte Vitale, mutuelle, ordonnances et examens récents', value: '1ère visite' },
        { icon: 'fa-wheelchair', title: 'Accessibilité', text: 'Cabinet accessible PMR, de plain-pied ou ascenseur', value: 'Accès PMR' },
        { icon: 'fa-clock', title: 'Horaires', text: DATA.horaires, value: 'Sur RDV' },
        { icon: 'fa-truck-medical', title: 'Urgences', text: 'En cas d\'urgence vitale, composez le 15 (SAMU)', value: '15 / 112' }
      ]
    },
    faq: [
      { q: 'Acceptez-vous de nouveaux patients ?', a: 'Oui, dans la limite des places disponibles. Utilisez le formulaire ou appelez le cabinet pour un premier rendez-vous.' },
      { q: 'Êtes-vous conventionné ?', a: 'Oui, secteur 1. La carte Vitale et la plupart des mutuelles sont acceptées, avec tiers payant selon les cas.' },
      { q: 'Proposez-vous la téléconsultation ?', a: 'Oui, pour les renouvellements et suivis simples. Elle est remboursée dans les mêmes conditions qu\'une consultation classique.' },
      { q: 'Que faire en cas d\'urgence ?', a: 'Pour toute urgence vitale, appelez le 15. Pour une urgence non vitale pendant nos horaires, appelez le cabinet : nous réservons des créneaux.' },
      { q: 'Le cabinet est-il accessible ?', a: 'Oui, le cabinet est accessible aux personnes à mobilité réduite. Un parking se trouve à proximité.' }
    ],
    form: {
      title: 'Prendre rendez-vous', subtitle: 'Demande en 3 étapes, réponse rapide', cta: 'Demander un rendez-vous',
      steps: [
        { title: 'Motif', icon: 'fa-stethoscope', fields: [
          { name: 'motif', type: 'cards', label: 'Motif de consultation', required: true, options: [
            { value: 'consultation', label: 'Consultation', icon: 'fa-user-doctor', desc: 'Symptômes, examen' },
            { value: 'suivi', label: 'Suivi', icon: 'fa-notes-medical', desc: 'Renouvellement, chronique' },
            { value: 'soins', label: 'Soins', icon: 'fa-hand-holding-medical', desc: 'Séance, acte' },
            { value: 'enfant', label: 'Enfant', icon: 'fa-baby', desc: 'Pédiatrie, vaccins' },
            { value: 'certificat', label: 'Certificat', icon: 'fa-file-medical', desc: 'Sport, aptitude' },
            { value: 'autre', label: 'Autre', icon: 'fa-ellipsis', desc: 'Autre demande' }
          ]},
          { name: 'nouveau_patient', type: 'toggle', label: 'Vous êtes', options: ['Déjà patient', 'Nouveau patient'] }
        ]},
        { title: 'Disponibilités', icon: 'fa-calendar', fields: [
          { name: 'creneau', type: 'multiselect', label: 'Créneaux préférés', options: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Matin', 'Après-midi', 'Soir'] },
          { name: 'mode', type: 'toggle', label: 'Mode de consultation', options: ['Au cabinet', 'Téléconsultation'] },
          { name: 'precisions', type: 'textarea', label: 'Précisions (optionnel)', placeholder: 'Ne mentionnez pas d\'informations médicales sensibles ici.', rows: 3 }
        ]},
        CONTACT_STEP([{ name: 'naissance', type: 'text', label: 'Date de naissance', placeholder: 'JJ/MM/AAAA' }])
      ]
    }
  },

  // ─────────────────────────────── CONSEIL ───────────────────────────────
  conseil: {
    label: 'Cabinet de conseil',
    icon: 'fa-lightbulb',
    colors: { primary: '#7c3aed', primaryDark: '#6d28d9', accent: '#db2777', gradient: 'from-violet-600 to-fuchsia-600', rgb: '124, 58, 237', tw: 'violet', accentTw: 'fuchsia' },
    fonts: { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    heroPhoto: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    nav: { about: 'L\'Équipe', services: 'Expertises', cta: 'Échanger sur votre projet' },
    hero: {
      title: 'Conseil & Stratégie',
      subtitle: 'Transformer vos ambitions en résultats mesurables',
      desc: `Cabinet de conseil à ${DATA.city}. Stratégie, organisation, marketing et accompagnement des dirigeants et des équipes.`,
      badges: ['Résultats mesurables', 'Approche sur mesure', 'Consultants seniors', 'Premier échange offert']
    },
    about: {
      tag: 'L\'équipe', title: 'Des consultants <em>opérationnels</em>',
      text: `${DATA.name} accompagne dirigeants, PME et organisations de ${DATA.city} : diagnostic, stratégie, mise en œuvre. Nous ne livrons pas un rapport, nous livrons des résultats.`,
      text2: 'Chaque mission est menée par un consultant senior, avec des objectifs et des indicateurs définis dès le départ.'
    },
    servicesTag: 'Nos expertises',
    servicesTitle: 'Des missions à <em>impact</em>',
    services: [
      { icon: 'fa-chess', name: 'Stratégie', desc: 'Positionnement, business model, plan de croissance.', price: 'Sur devis' },
      { icon: 'fa-sitemap', name: 'Organisation', desc: 'Process, efficacité opérationnelle, transformation.', price: 'Sur devis' },
      { icon: 'fa-bullhorn', name: 'Marketing & Commercial', desc: 'Acquisition, offre, pipeline, pricing.', price: 'Dès 1 500 €/mission' },
      { icon: 'fa-people-group', name: 'RH & Management', desc: 'Recrutement, engagement, management d\'équipe.', price: 'Sur devis' },
      { icon: 'fa-user-tie', name: 'Coaching dirigeant', desc: 'Accompagnement individuel, prise de décision.', price: 'Dès 200 €/séance' },
      { icon: 'fa-chalkboard-user', name: 'Formation', desc: 'Ateliers sur mesure, montée en compétences.', price: 'Dès 900 €/jour' }
    ],
    values: [
      { icon: 'fa-bullseye', title: 'Résultats', desc: 'Des objectifs chiffrés, suivis.' },
      { icon: 'fa-comment-dots', title: 'Franchise', desc: 'On vous dit ce qu\'on pense.' },
      { icon: 'fa-hands-helping', title: 'Terrain', desc: 'On met en œuvre avec vous.' },
      { icon: 'fa-lock', title: 'Confidentialité', desc: 'Vos enjeux restent entre nous.' }
    ],
    stats: [
      { value: '150+', label: 'Missions réalisées', icon: 'fa-rocket' },
      { value: '+32%', label: 'Croissance moyenne clients', icon: 'fa-arrow-trend-up' },
      { value: '95%', label: 'Clients qui nous recommandent', icon: 'fa-thumbs-up' },
      { value: '12+', label: 'Ans d\'expérience', icon: 'fa-award' }
    ],
    process: [
      { icon: 'fa-comments', title: 'Échange', desc: 'Comprendre vos enjeux, sans engagement.' },
      { icon: 'fa-magnifying-glass-chart', title: 'Diagnostic', desc: 'Analyse chiffrée de la situation.' },
      { icon: 'fa-map', title: 'Plan d\'action', desc: 'Priorités, moyens, indicateurs.' },
      { icon: 'fa-gears', title: 'Mise en œuvre', desc: 'Accompagnement terrain et suivi des résultats.' }
    ],
    highlight: {
      tag: 'Diagnostic offert', title: 'Où en est <em>votre entreprise</em> ?',
      desc: 'Un premier diagnostic de 45 minutes pour identifier vos leviers de croissance prioritaires. Offert, sans engagement.',
      items: [
        { icon: 'fa-chart-line', title: 'Performance commerciale', text: 'Pipeline, conversion, panier moyen', value: 'Analyse' },
        { icon: 'fa-sitemap', title: 'Organisation', text: 'Process, rôles, goulots d\'étranglement', value: 'Audit' },
        { icon: 'fa-people-group', title: 'Équipe', text: 'Engagement, compétences, management', value: 'Diagnostic' },
        { icon: 'fa-flag-checkered', title: 'Priorités', text: '3 actions concrètes à lancer', value: 'Livrable' }
      ]
    },
    faq: [
      { q: 'Pour quel type d\'entreprise intervenez-vous ?', a: 'TPE, PME, startups et organisations, de 1 à 250 personnes. Nos méthodes s\'adaptent à votre taille et votre secteur.' },
      { q: 'Comment sont facturées les missions ?', a: 'Au forfait selon un périmètre défini ensemble, ou à la journée pour les accompagnements ponctuels. Devis détaillé avant chaque mission.' },
      { q: 'Combien de temps dure une mission ?', a: 'De quelques jours (diagnostic, atelier) à plusieurs mois (transformation). Nous privilégions des cycles courts avec des résultats visibles rapidement.' },
      { q: 'Intervenez-vous à distance ?', a: 'Oui, en mixant visio et présence sur site à ' + DATA.city + ' et sa région selon les besoins.' },
      { q: 'Vos formations sont-elles finançables ?', a: 'Oui, nos formations peuvent être prises en charge par votre OPCO. Nous vous accompagnons dans les démarches.' }
    ],
    form: {
      title: 'Votre projet', subtitle: 'Premier échange offert, en 3 étapes', cta: 'Demander un échange',
      steps: [
        { title: 'Votre besoin', icon: 'fa-lightbulb', fields: [
          { name: 'besoin', type: 'cards', label: 'Sur quoi souhaitez-vous avancer ?', required: true, options: [
            { value: 'strategie', label: 'Stratégie', icon: 'fa-chess', desc: 'Cap, croissance' },
            { value: 'organisation', label: 'Organisation', icon: 'fa-sitemap', desc: 'Process, efficacité' },
            { value: 'commercial', label: 'Commercial', icon: 'fa-bullhorn', desc: 'Ventes, marketing' },
            { value: 'rh', label: 'Équipe / RH', icon: 'fa-people-group', desc: 'Management, recrutement' },
            { value: 'coaching', label: 'Coaching', icon: 'fa-user-tie', desc: 'Dirigeant, manager' },
            { value: 'formation', label: 'Formation', icon: 'fa-chalkboard-user', desc: 'Ateliers, montée en compétences' }
          ]}
        ]},
        { title: 'Contexte', icon: 'fa-building', fields: [
          { name: 'taille', type: 'select', label: 'Taille de l\'organisation', options: ['Indépendant', '2-10 personnes', '11-50 personnes', '51-250 personnes', '> 250 personnes'] },
          { name: 'secteur', type: 'text', label: 'Secteur d\'activité', placeholder: 'Ex : commerce, services, industrie...' },
          { name: 'urgence', type: 'toggle', label: 'Horizon', options: ['Réflexion', 'À lancer sous 3 mois', 'Urgent'] },
          { name: 'description', type: 'textarea', label: 'Décrivez votre enjeu', placeholder: 'Quel est le problème à résoudre ou l\'objectif à atteindre ?', rows: 4 }
        ]},
        CONTACT_STEP([{ name: 'entreprise', type: 'text', label: 'Entreprise', placeholder: 'Optionnel' }])
      ]
    }
  },

  // ─────────────────────────────── DEFAULT ───────────────────────────────
  default: {
    label: 'Cabinet',
    icon: 'fa-briefcase',
    colors: { primary: '#2563eb', primaryDark: '#1d4ed8', accent: '#0891b2', gradient: 'from-blue-600 to-cyan-600', rgb: '37, 99, 235', tw: 'blue', accentTw: 'cyan' },
    fonts: { display: 'Playfair Display', body: 'Plus Jakarta Sans' },
    heroPhoto: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80',
    secondaryPhoto: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
    nav: { about: 'À propos', services: 'Services', cta: 'Nous contacter' },
    hero: {
      title: DATA.name,
      subtitle: 'L\'expertise à votre service',
      desc: `${DATA.name} à ${DATA.city} : des services professionnels, un accompagnement personnalisé et des réponses rapides.`,
      badges: ['Professionnels qualifiés', 'Devis gratuit', 'Réponse sous 24h', 'Interlocuteur dédié']
    },
    about: {
      tag: 'À propos', title: 'Votre partenaire de <em>confiance</em>',
      text: `${DATA.name} accompagne particuliers et professionnels à ${DATA.city} avec sérieux et proximité.`,
      text2: 'Un interlocuteur unique, des tarifs clairs et un suivi attentif à chaque étape.'
    },
    servicesTag: 'Nos services',
    servicesTitle: 'Ce que nous <em>faisons</em>',
    services: [
      { icon: 'fa-handshake', name: 'Conseil', desc: 'Accompagnement sur mesure.', price: 'Sur devis' },
      { icon: 'fa-award', name: 'Expertise', desc: 'Professionnels qualifiés.', price: 'Sur devis' },
      { icon: 'fa-user-tie', name: 'Suivi dédié', desc: 'Un interlocuteur unique.', price: 'Inclus' },
      { icon: 'fa-bolt', name: 'Réactivité', desc: 'Réponses rapides.', price: 'Inclus' },
      { icon: 'fa-lock', name: 'Confidentialité', desc: 'Discrétion absolue.', price: 'Inclus' },
      { icon: 'fa-file-invoice-dollar', name: 'Transparence', desc: 'Tarifs clairs, devis détaillé.', price: 'Devis gratuit' }
    ],
    values: [
      { icon: 'fa-gem', title: 'Excellence', desc: 'Le meilleur dans chaque mission.' },
      { icon: 'fa-shield-heart', title: 'Intégrité', desc: 'Transparence et honnêteté.' },
      { icon: 'fa-rocket', title: 'Innovation', desc: 'Outils modernes, méthodes efficaces.' },
      { icon: 'fa-heart-pulse', title: 'Engagement', desc: 'Votre réussite est notre priorité.' }
    ],
    stats: [
      { value: '15+', label: 'Ans d\'expérience', icon: 'fa-calendar-check' },
      { value: '500+', label: 'Clients accompagnés', icon: 'fa-users' },
      { value: '98%', label: 'Satisfaction', icon: 'fa-face-smile' },
      { value: '24h', label: 'Délai de réponse', icon: 'fa-bolt' }
    ],
    process: [
      { icon: 'fa-comments', title: 'Échange', desc: 'Comprendre vos besoins.' },
      { icon: 'fa-calendar-check', title: 'Rendez-vous', desc: 'Sur place ou en visio.' },
      { icon: 'fa-file-signature', title: 'Proposition', desc: 'Devis détaillé et clair.' },
      { icon: 'fa-rocket', title: 'Lancement', desc: 'Démarrage avec suivi régulier.' }
    ],
    highlight: {
      tag: 'Pourquoi nous', title: 'Ce qui fait la <em>différence</em>',
      desc: 'Des engagements concrets, pas des promesses.',
      items: [
        { icon: 'fa-phone', title: 'Réponse rapide', text: 'Chaque demande traitée sous 24h', value: '24h' },
        { icon: 'fa-file-invoice', title: 'Devis gratuit', text: 'Détaillé, sans engagement', value: 'Gratuit' },
        { icon: 'fa-user-tie', title: 'Interlocuteur unique', text: 'Qui connaît votre dossier', value: 'Dédié' },
        { icon: 'fa-star', title: 'Avis vérifiés', text: DATA.reviews_count + ' avis Google', value: DATA.rating + '/5' }
      ]
    },
    faq: [
      { q: 'Comment prendre rendez-vous ?', a: 'Remplissez le formulaire ou appelez-nous. Nous vous répondons sous 24h.' },
      { q: 'Quels sont vos tarifs ?', a: 'Tarifs transparents avec devis détaillé avant toute intervention.' },
      { q: 'Proposez-vous des rendez-vous à distance ?', a: 'Oui, en visioconférence, avec la même qualité d\'accompagnement.' },
      { q: 'Quelle est votre zone d\'intervention ?', a: DATA.city + ' et sa région. Extension possible selon les dossiers.' }
    ],
    form: {
      title: 'Demande de contact', subtitle: 'Réponse sous 24h', cta: 'Envoyer ma demande',
      steps: [
        { title: 'Votre besoin', icon: 'fa-clipboard-list', fields: [
          { name: 'objet', type: 'cards', label: 'Objet de votre demande', required: true, options: [
            { value: 'info', label: 'Information', icon: 'fa-circle-info', desc: 'Renseignements' },
            { value: 'devis', label: 'Devis', icon: 'fa-file-invoice', desc: 'Demander un prix' },
            { value: 'rdv', label: 'Rendez-vous', icon: 'fa-calendar', desc: 'Prendre RDV' },
            { value: 'autre', label: 'Autre', icon: 'fa-ellipsis', desc: 'Autre demande' }
          ]}
        ]},
        { title: 'Message', icon: 'fa-message', fields: [
          { name: 'message', type: 'textarea', label: 'Votre message', placeholder: 'Décrivez votre demande...', rows: 5 }
        ]},
        CONTACT_STEP()
      ]
    }
  }
};

const S = SECTORS[serviceType] || SECTORS.default;
const colors = S.colors;
const tw = colors.tw;
const formConfig = S.form;

console.log('   Secteur détecté:', serviceType, '|', S.label);

// ═══════════════════════════════════════════════════════════════════════════
// OVERRIDES GEMINI (le contenu IA prime sur le secteur quand il existe)
// ═══════════════════════════════════════════════════════════════════════════

const pickArray = (arr, min) => Array.isArray(arr) && arr.length >= (min || 1) ? arr : null;

const services = (pickArray(content.services, 3) || S.services).slice(0, 6).map((s, i) => ({
  icon: s.icon || S.services[i % S.services.length].icon,
  name: s.name || s.title || S.services[i % S.services.length].name,
  desc: s.desc || s.description || '',
  price: s.price || s.tarif || 'Sur devis'
}));

const faq = (pickArray(content.faq, 3) || S.faq).slice(0, 6).map(f => ({
  q: f.q || f.question, a: f.a || f.answer || f.reponse
})).filter(f => f.q && f.a);

const C = {
  heroTitle: content.hero_title || S.hero.title,
  heroSubtitle: content.hero_subtitle || S.hero.subtitle,
  heroDesc: content.meta_description || content.hero_desc || S.hero.desc,
  aboutTitle: content.about_title || S.about.title,
  aboutText: content.about_text || content.about || S.about.text,
  aboutText2: content.about_text2 || S.about.text2,
  badges: pickArray(content.badges, 3) || S.hero.badges
};

// ═══ PHOTOS ═══
const photos = DATA.categorized_photos || {};
const heroPhoto = photos.facade || photos.exterior || photos.hero || DATA.photos?.[0]?.url || DATA.photos?.[0] || S.heroPhoto;
const officePhoto = photos.interior || photos.office || DATA.photos?.[1]?.url || DATA.photos?.[1] || S.secondaryPhoto;
const galleryPhotos = (DATA.photos || []).map(p => p?.url || p).filter(Boolean).slice(0, 4);

let reviews = (DATA.reviews || []).filter(r => r.text && r.text.length > 20).slice(0, 6);

const headerName = DATA.name.length > 28 ? DATA.name.substring(0, 25) + '…' : DATA.name;
const siteUrl = (siteConfig.PREVIEW_BASE_URL || 'https://local-visibility.com/previews') + '/' + DATA.slug + '/';
const checkoutUrl = 'https://local-visibility.com/paiement/checkout-subscription.html?name=' + encodeURIComponent(DATA.name) + '&preview=' + encodeURIComponent(siteUrl) + '&slug=' + encodeURIComponent(DATA.slug);
const WEBHOOK_URL = siteConfig.WEBHOOK_DEVIS_URL || 'https://n8n.srv1155413.hstgr.cloud/webhook/demande-devis';
const MAPS_KEY = siteConfig.MAPS_EMBED_KEY || 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';

const renderStars = (r) => { let s = ''; const n = Number(r) || 0; for (let i = 0; i < Math.floor(n); i++) s += '<i class="fa-solid fa-star"></i>'; if (n % 1 >= 0.5) s += '<i class="fa-solid fa-star-half-stroke"></i>'; return s; };
const em = (str) => String(str || '').replace(/<em>/g, `<span class="text-${tw}-600 italic">`).replace(/<\/em>/g, '</span>');
const emLight = (str) => String(str || '').replace(/<em>/g, `<span class="text-${tw}-400 italic">`).replace(/<\/em>/g, '</span>');

console.log('✅ Données secteur chargées');

// ═══════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════

const fontDisplay = S.fonts.display;
const fontBody = S.fonts.body;
const fontImport = [...new Set([fontDisplay, fontBody])].map(f => 'family=' + f.replace(/ /g, '+') + ':ital,wght@0,400;0,500;0,600;0,700;0,800;1,400').join('&');

const CSS = `<style>
@import url('https://fonts.googleapis.com/css2?${fontImport}&display=swap');
*{font-family:'${fontBody}',sans-serif;box-sizing:border-box}
.font-display{font-family:'${fontDisplay}',serif}
.glass{background:rgba(255,255,255,0.95);backdrop-filter:blur(20px)}
.glass-card{background:rgba(255,255,255,0.98);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.3)}
@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes checkmark{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.animate-slideUp{animation:slideUp 0.8s ease forwards;opacity:0}
.animate-float{animation:float 4s ease-in-out infinite}
.animate-pulse{animation:pulse 2s ease-in-out infinite}
.delay-100{animation-delay:0.1s}.delay-200{animation-delay:0.2s}.delay-300{animation-delay:0.3s}.delay-400{animation-delay:0.4s}
.card-premium{background:linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95));border:1px solid rgba(226,232,240,0.6);border-radius:1.5rem;transition:all 0.5s cubic-bezier(0.4,0,0.2,1)}
.card-premium:hover{transform:translateY(-10px);box-shadow:0 30px 60px -15px rgba(${colors.rgb},0.2)}
.hero-gradient{background:linear-gradient(135deg,rgba(15,23,42,0.97) 0%,rgba(30,41,59,0.93) 50%,rgba(15,23,42,0.9) 100%)}
.hero-pattern{background-image:radial-gradient(circle at 20% 30%,rgba(${colors.rgb},0.18) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(${colors.rgb},0.12) 0%,transparent 40%)}
.icon-box{background:linear-gradient(135deg,${colors.primary},${colors.primaryDark});box-shadow:0 15px 40px -10px rgba(${colors.rgb},0.5)}
.accent-line{width:60px;height:4px;border-radius:2px;background:linear-gradient(90deg,${colors.primary},${colors.accent})}
.reveal{opacity:0;transform:translateY(30px);transition:all 0.8s ease}
.reveal.active{opacity:1;transform:translateY(0)}
.form-container{position:relative}
.progress-bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:2rem}
.progress-fill{height:100%;background:linear-gradient(90deg,${colors.primary},${colors.accent});border-radius:3px;transition:width 0.5s cubic-bezier(0.4,0,0.2,1)}
.steps-indicator{display:flex;justify-content:space-between;margin-bottom:3rem;position:relative}
.steps-indicator::before{content:'';position:absolute;top:20px;left:0;right:0;height:2px;background:#e2e8f0;z-index:0}
.step-dot{width:40px;height:40px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#94a3b8;position:relative;z-index:1;transition:all 0.4s ease;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
.step-dot.active{background:linear-gradient(135deg,${colors.primary},${colors.primaryDark});color:#fff;transform:scale(1.1);box-shadow:0 5px 20px rgba(${colors.rgb},0.4)}
.step-dot.completed{background:#10b981;color:#fff}
.step-dot.completed i{animation:checkmark 0.4s ease}
.step-label{font-size:11px;font-weight:600;color:#94a3b8;white-space:nowrap;margin-top:6px;transition:color 0.3s}
.step-wrap.active .step-label,.step-wrap.completed .step-label{color:#1e293b}
.form-step{display:none}
.form-step.active{display:block;animation:slideInRight 0.4s ease}
.choice-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}
.choice-card{padding:1.1rem 0.75rem;border:2px solid #e2e8f0;border-radius:1rem;cursor:pointer;transition:all 0.3s ease;text-align:center;background:#fff}
.choice-card:hover{border-color:${colors.primary};background:rgba(${colors.rgb},0.03);transform:translateY(-2px)}
.choice-card.selected{border-color:${colors.primary};background:linear-gradient(135deg,rgba(${colors.rgb},0.08),rgba(${colors.rgb},0.03));box-shadow:0 5px 20px rgba(${colors.rgb},0.15)}
.choice-card.selected .choice-icon{background:linear-gradient(135deg,${colors.primary},${colors.primaryDark});color:#fff}
.choice-icon{width:46px;height:46px;border-radius:12px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin:0 auto 0.6rem;font-size:1.2rem;color:#64748b;transition:all 0.3s ease}
.choice-title{font-weight:700;color:#1e293b;font-size:0.85rem;margin-bottom:0.2rem}
.choice-desc{font-size:0.7rem;color:#94a3b8;line-height:1.2}
.toggle-group{display:flex;gap:0.5rem;padding:4px;background:#f1f5f9;border-radius:12px}
.toggle-option{flex:1;padding:0.7rem 0.75rem;border-radius:10px;font-weight:600;font-size:0.8rem;cursor:pointer;transition:all 0.3s ease;text-align:center;color:#64748b}
.toggle-option.active{background:#fff;color:${colors.primary};box-shadow:0 2px 10px rgba(0,0,0,0.08)}
.multiselect-chips{display:flex;flex-wrap:wrap;gap:8px}
.multiselect-chip{padding:0.55rem 0.95rem;border:2px solid #e2e8f0;border-radius:2rem;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.3s ease;color:#64748b;background:#fff}
.multiselect-chip:hover{border-color:${colors.primary}}
.multiselect-chip.selected{border-color:${colors.primary};background:linear-gradient(135deg,${colors.primary},${colors.primaryDark});color:#fff}
.form-input{width:100%;padding:0.95rem 1.2rem;border:2px solid #e2e8f0;border-radius:12px;font-size:1rem;font-weight:500;transition:all 0.3s ease;background:#fff}
.form-input:focus{border-color:${colors.primary};box-shadow:0 0 0 4px rgba(${colors.rgb},0.1);outline:none}
.form-input::placeholder{color:#94a3b8}
.form-label{display:block;font-size:0.75rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem}
.field-error{border-color:#ef4444!important;animation:shake 0.3s ease}
.form-error-msg{display:none;color:#ef4444;font-size:0.8rem;font-weight:600;margin-top:0.75rem}
.form-error-msg.show{display:block}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 1rem}
.form-grid > .full{grid-column:1 / -1}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}}
.btn-next{padding:0.95rem 1.8rem;background:linear-gradient(135deg,${colors.primary},${colors.primaryDark});color:#fff;border:none;border-radius:12px;font-weight:700;font-size:0.95rem;cursor:pointer;transition:all 0.3s ease;display:inline-flex;align-items:center;justify-content:center;gap:0.5rem}
.btn-next:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(${colors.rgb},0.3)}
.btn-next:disabled{opacity:0.7;cursor:wait;transform:none}
.btn-prev{padding:0.95rem 1.4rem;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-weight:600;cursor:pointer;transition:all 0.3s ease}
.btn-prev:hover{background:#e2e8f0}
.faq-answer{max-height:0;overflow:hidden;transition:max-height 0.4s ease}
.faq-item.active .faq-answer{max-height:500px}
.faq-item.active .faq-chevron{transform:rotate(180deg)}
.highlight-card{background:#fff;border:1px solid #e2e8f0;border-radius:1.25rem;padding:1.5rem;transition:all 0.4s ease}
.highlight-card:hover{border-color:${colors.primary};box-shadow:0 20px 40px -15px rgba(${colors.rgb},0.25);transform:translateY(-4px)}
.gallery-item{position:relative;overflow:hidden;border-radius:1.25rem;aspect-ratio:4/3;background:#0f172a}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform 0.7s ease}
.gallery-item:hover img{transform:scale(1.06)}
.gallery-item .caption{position:absolute;inset:auto 0 0 0;padding:1.25rem;background:linear-gradient(to top,rgba(15,23,42,0.9),transparent);color:#fff}
.purchase-bar{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#0f172a,#1e293b);border-top:3px solid ${colors.primary};padding:14px 24px;z-index:9000;display:flex;justify-content:space-between;align-items:center}
body{padding-bottom:85px}
@media(max-width:768px){body{padding-bottom:140px}.purchase-bar{flex-direction:column;gap:12px}.choice-cards{grid-template-columns:repeat(2,1fr)}.step-label{display:none}}
</style>`;

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS COMMUNS
// ═══════════════════════════════════════════════════════════════════════════

const headHTML = (title, desc) => `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} | ${esc(DATA.name)}</title>
<meta name="description" content="${esc(desc || C.heroDesc)}">
<meta property="og:title" content="${esc(title)} | ${esc(DATA.name)}">
<meta property="og:description" content="${esc(desc || C.heroDesc)}">
<meta property="og:image" content="${esc(heroPhoto)}">
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{primary:'${colors.primary}',accent:'${colors.accent}'}}}}<\/script>
${CSS}
</head>`;

const NAV_LINKS = [
  { href: 'index.html', label: 'Accueil', key: 'accueil' },
  { href: 'services.html', label: S.nav.services, key: 'services' },
  { href: 'cabinet.html', label: S.nav.about, key: 'cabinet' },
  { href: 'contact.html', label: 'Contact', key: 'contact' }
];

const navHTML = (active) => {
  const isHome = active === 'accueil';
  const linkCls = (key) => isHome
    ? `text-white/90 hover:text-${tw}-400${key === active ? ' text-' + tw + '-400' : ''}`
    : `text-slate-600 hover:text-${tw}-600${key === active ? ' text-' + tw + '-600' : ''}`;
  return `<nav class="fixed w-full z-50 transition-all duration-500 ${isHome ? 'bg-transparent' : 'glass shadow-lg'}" id="navbar">
<div class="max-w-7xl mx-auto px-4 lg:px-8">
<div class="flex justify-between h-20 items-center">
<a href="index.html" class="flex items-center gap-3">
<div class="w-12 h-12 icon-box rounded-2xl flex items-center justify-center text-white"><i class="fa-solid ${S.icon} text-lg"></i></div>
<span class="logo-text font-extrabold text-xl ${isHome ? 'text-white' : 'text-slate-900'} hidden sm:block">${esc(headerName)}</span>
</a>
<div class="hidden lg:flex items-center gap-6">
${NAV_LINKS.map(l => `<a href="${l.href}" class="nav-link font-semibold text-sm ${linkCls(l.key)} transition">${esc(l.label)}</a>`).join('')}
${DATA.phone ? `<a href="${phoneHref}" class="text-${tw}-500 font-bold"><i class="fa-solid fa-phone mr-2"></i><span class="hidden xl:inline">${esc(DATA.phoneFmt)}</span></a>` : ''}
<a href="${isHome ? '#rdv' : 'contact.html#rdv'}" class="px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-bold hover:shadow-lg transition">${esc(S.nav.cta)}</a>
</div>
<button class="lg:hidden ${isHome ? 'text-white' : 'text-slate-700'} text-2xl" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
</div>
</div>
<div id="mobile-menu" class="hidden lg:hidden glass px-4 py-6 shadow-xl">
<div class="flex flex-col gap-4">
${NAV_LINKS.map(l => `<a href="${l.href}" class="font-semibold text-slate-700 py-2">${esc(l.label)}</a>`).join('')}
<a href="${isHome ? '#rdv' : 'contact.html#rdv'}" class="bg-gradient-to-r ${colors.gradient} text-white text-center py-4 rounded-xl font-bold mt-2">${esc(S.nav.cta)}</a>
</div>
</div>
</nav>`;
};

const pageHeroHTML = (tag, title) => `<section class="pt-32 pb-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white relative overflow-hidden">
<div class="absolute inset-0 hero-pattern opacity-40"></div>
<div class="max-w-7xl mx-auto px-4 relative z-10 text-center">
<span class="inline-block text-${tw}-400 font-bold uppercase text-xs tracking-[0.3em] mb-4 py-2 px-6 bg-${tw}-500/10 rounded-full">${esc(tag)}</span>
<h1 class="font-display text-5xl lg:text-6xl font-bold mb-4">${emLight(title)}</h1>
<p class="text-slate-300 max-w-2xl mx-auto">${esc(S.label)} · ${esc(DATA.city)}</p>
</div>
</section>`;

const sectionHeadHTML = (tag, title, light) => `<div class="text-center max-w-3xl mx-auto mb-16 reveal">
${tag ? `<span class="inline-block ${light ? 'text-' + tw + '-400 bg-' + tw + '-500/10' : 'text-' + tw + '-600 bg-' + tw + '-50'} font-bold uppercase text-xs tracking-[0.3em] mb-4 py-2 px-6 rounded-full">${esc(tag)}</span>` : ''}
<h2 class="font-display text-4xl lg:text-5xl font-bold ${light ? 'text-white' : 'text-slate-900'} mb-4">${light ? emLight(title) : em(title)}</h2>
<div class="accent-line mx-auto"></div>
</div>`;

const footerHTML = `<footer class="bg-gradient-to-b from-slate-900 to-slate-950 text-white pt-20 pb-10">
<div class="max-w-7xl mx-auto px-4">
<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
<div class="lg:col-span-2">
<div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 icon-box rounded-2xl flex items-center justify-center text-white"><i class="fa-solid ${S.icon}"></i></div><span class="font-bold text-xl">${esc(DATA.name)}</span></div>
<p class="text-slate-400 text-sm mb-6 max-w-md">${esc(C.heroDesc)}</p>
<div class="flex gap-3"><a href="${DATA.mapsUrl}" target="_blank" rel="noopener" class="w-11 h-11 bg-white/10 hover:bg-${tw}-600 rounded-xl flex items-center justify-center transition" aria-label="Google Maps"><i class="fa-brands fa-google"></i></a><a href="#" class="w-11 h-11 bg-white/10 hover:bg-blue-600 rounded-xl flex items-center justify-center transition" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a></div>
</div>
<div><h4 class="text-${tw}-400 font-bold text-xs uppercase tracking-widest mb-6">Navigation</h4><ul class="space-y-3 text-slate-400 text-sm">${NAV_LINKS.map(l => `<li><a href="${l.href}" class="hover:text-white transition">${esc(l.label)}</a></li>`).join('')}</ul></div>
<div><h4 class="text-${tw}-400 font-bold text-xs uppercase tracking-widest mb-6">Contact</h4><ul class="space-y-3 text-slate-400 text-sm">${DATA.phone ? `<li><a href="${phoneHref}" class="hover:text-white transition"><i class="fa-solid fa-phone mr-2 text-${tw}-400"></i>${esc(DATA.phoneFmt)}</a></li>` : ''}<li><i class="fa-solid fa-location-dot mr-2 text-${tw}-400"></i>${esc(DATA.address || DATA.city)}</li><li><i class="fa-solid fa-clock mr-2 text-${tw}-400"></i>${esc(DATA.horaires)}</li></ul></div>
</div>
<div class="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs"><span>© ${new Date().getFullYear()} ${esc(DATA.name)} · ${esc(S.label)}</span><span>Site par <a href="https://local-visibility.com" class="text-${tw}-400 hover:underline">Local Visibility</a></span></div>
</div>
</footer>`;

const purchaseBarHTML = `<div class="purchase-bar"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse"><i class="fa-solid fa-check text-green-400 text-lg"></i></div><div><h4 class="font-bold text-white text-sm">Votre site est prêt</h4><p class="text-xs text-slate-400 hidden sm:block">Débloquez-le pour le mettre en ligne</p></div></div><a href="${checkoutUrl}" target="_blank" rel="noopener" class="px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-bold hover:shadow-lg transition">Débloquer <i class="fa-solid fa-unlock ml-1"></i></a></div>`;

const statsSection = `<section class="py-16 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden">
<div class="absolute inset-0 hero-pattern opacity-30"></div>
<div class="max-w-7xl mx-auto px-4 relative z-10">
<div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
${S.stats.map(s => `<div class="reveal"><div class="w-14 h-14 bg-${tw}-500/20 rounded-2xl flex items-center justify-center text-${tw}-400 text-xl mx-auto mb-4"><i class="fa-solid ${s.icon}"></i></div><div class="text-4xl font-black text-white mb-1">${esc(s.value)}</div><div class="text-xs font-bold uppercase text-${tw}-400 tracking-wider">${esc(s.label)}</div></div>`).join('')}
</div>
</div>
</section>`;

const processSection = (bg) => `<section class="py-24 ${bg || 'bg-white'}">
<div class="max-w-7xl mx-auto px-4">
${sectionHeadHTML('Notre méthode', 'Comment ça <em>se passe</em>')}
<div class="grid md:grid-cols-4 gap-8 relative">
<div class="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-${tw}-200 to-transparent"></div>
${S.process.map((s, i) => `<div class="text-center reveal">
<div class="relative z-10 mb-5 inline-block"><div class="w-16 h-16 icon-box rounded-2xl flex items-center justify-center text-white text-xl mx-auto"><i class="fa-solid ${s.icon}"></i></div><div class="absolute -top-2 -right-2 w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs">${i + 1}</div></div>
<h4 class="font-bold text-slate-900 mb-2">${esc(s.title)}</h4>
<p class="text-slate-500 text-sm">${esc(s.desc)}</p>
</div>`).join('')}
</div>
</div>
</section>`;

const valuesSection = (bg) => `<section class="py-24 ${bg || 'bg-slate-50'}">
<div class="max-w-7xl mx-auto px-4">
${sectionHeadHTML('Nos engagements', 'Nos <em>valeurs</em>')}
<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
${S.values.map(v => `<div class="text-center p-8 bg-white rounded-[2rem] card-premium reveal">
<div class="w-16 h-16 icon-box rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-5"><i class="fa-solid ${v.icon}"></i></div>
<h3 class="font-bold text-lg mb-2">${esc(v.title)}</h3>
<p class="text-slate-500 text-sm">${esc(v.desc)}</p>
</div>`).join('')}
</div>
</div>
</section>`;

const servicesGrid = (compact) => `<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
${services.map(s => `<div class="card-premium ${compact ? 'p-7' : 'p-8'} group reveal">
<div class="${compact ? 'w-14 h-14 text-xl mb-5' : 'w-16 h-16 text-2xl mb-6'} icon-box rounded-2xl flex items-center justify-center text-white"><i class="fa-solid ${s.icon}"></i></div>
<h3 class="font-display ${compact ? 'text-lg' : 'text-xl'} font-bold text-slate-900 mb-2">${esc(s.name)}</h3>
<p class="text-slate-500 text-sm mb-4">${esc(s.desc)}</p>
<div class="flex items-center justify-between pt-4 border-t border-slate-100">
<span class="font-bold text-${tw}-600 text-sm">${esc(s.price)}</span>
<a href="${compact ? '#rdv' : 'contact.html#rdv'}" class="text-xs font-bold text-slate-700 hover:text-${tw}-600">Demander <i class="fa-solid fa-arrow-right ml-1"></i></a>
</div>
</div>`).join('')}
</div>`;

// Section signature du secteur (honoraires, estimation, bilan, forfaits, réalisations, infos pratiques, diagnostic)
const highlightSection = () => {
  const h = S.highlight;
  if (h.gallery && galleryPhotos.length >= 2) {
    return `<section class="py-24 bg-slate-900 text-white">
<div class="max-w-7xl mx-auto px-4">
${sectionHeadHTML(h.tag, h.title, true)}
<p class="text-slate-400 text-center max-w-2xl mx-auto -mt-8 mb-12 reveal">${esc(h.desc)}</p>
<div class="grid md:grid-cols-2 gap-6">
${galleryPhotos.map((p, i) => `<div class="gallery-item reveal"><img src="${esc(p)}" alt="${esc(h.items[i]?.title || DATA.name)}" loading="lazy"><div class="caption"><div class="font-bold">${esc(h.items[i]?.title || 'Projet')}</div><div class="text-xs text-white/70">${esc(h.items[i]?.text || '')}</div></div></div>`).join('')}
</div>
</div>
</section>`;
  }
  return `<section class="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
<div class="absolute -top-32 -right-32 w-96 h-96 bg-${tw}-100 rounded-full blur-3xl opacity-60"></div>
<div class="max-w-7xl mx-auto px-4 relative z-10">
<div class="grid lg:grid-cols-5 gap-12 items-center">
<div class="lg:col-span-2 reveal">
<span class="inline-block text-${tw}-600 font-bold uppercase text-xs tracking-[0.3em] mb-4 py-2 px-6 bg-${tw}-50 rounded-full">${esc(h.tag)}</span>
<h2 class="font-display text-4xl lg:text-5xl font-bold text-slate-900 mb-6">${em(h.title)}</h2>
<p class="text-slate-500 text-lg mb-8">${esc(h.desc)}</p>
<a href="#rdv" class="inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-bold hover:shadow-xl transition">${esc(S.nav.cta)} <i class="fa-solid fa-arrow-right"></i></a>
</div>
<div class="lg:col-span-3 grid sm:grid-cols-2 gap-5">
${h.items.map(it => `<div class="highlight-card reveal">
<div class="flex items-start justify-between mb-4"><div class="w-12 h-12 bg-${tw}-50 text-${tw}-600 rounded-xl flex items-center justify-center text-lg"><i class="fa-solid ${it.icon}"></i></div><span class="text-xs font-black uppercase tracking-wider text-${tw}-600 bg-${tw}-50 px-3 py-1 rounded-full">${esc(it.value)}</span></div>
<h4 class="font-bold text-slate-900 mb-1">${esc(it.title)}</h4>
<p class="text-slate-500 text-sm">${esc(it.text)}</p>
</div>`).join('')}
</div>
</div>
</div>
</section>`;
};

const faqSection = (bg) => `<section class="py-24 ${bg || 'bg-slate-50'}">
<div class="max-w-3xl mx-auto px-4">
${sectionHeadHTML('FAQ', 'Questions <em>fréquentes</em>')}
<div class="bg-white rounded-[2rem] p-8 shadow-lg reveal">
${faq.map((f, i) => `<div class="faq-item border-b border-slate-100 last:border-0 ${i === 0 ? 'active' : ''}">
<button class="faq-question w-full py-5 text-left font-bold text-slate-900 flex justify-between items-center gap-4 hover:text-${tw}-600 transition"><span>${esc(f.q)}</span><i class="fa-solid fa-chevron-down text-${tw}-600 faq-chevron transition-transform text-sm shrink-0"></i></button>
<div class="faq-answer"><p class="pb-5 text-slate-500">${esc(f.a)}</p></div>
</div>`).join('')}
</div>
</div>
</section>`;

const ctaSection = `<section class="py-24 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden">
<div class="absolute inset-0 hero-pattern"></div>
<div class="max-w-4xl mx-auto px-4 text-center relative z-10">
<h2 class="font-display text-4xl lg:text-5xl font-bold text-white mb-6">${emLight(content.cta_title || 'Parlons de <em>votre projet</em>')}</h2>
<p class="text-xl text-slate-300 mb-10">${esc(content.cta_text || 'Premier échange gratuit et sans engagement.')}</p>
<div class="flex flex-col sm:flex-row gap-4 justify-center">
<a href="contact.html#rdv" class="px-10 py-5 bg-gradient-to-r ${colors.gradient} text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition"><i class="fa-solid fa-calendar-check mr-2"></i>${esc(S.nav.cta)}</a>
${DATA.phone ? `<a href="${phoneHref}" class="px-10 py-5 bg-white/10 border-2 border-white/20 text-white rounded-2xl font-bold text-lg hover:bg-white hover:text-slate-900 transition"><i class="fa-solid fa-phone mr-2"></i>${esc(DATA.phoneFmt)}</a>` : ''}
</div>
</div>
</section>`;

const mapSection = `<section class="h-[400px] relative">
<iframe src="https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(DATA.address + ' ' + DATA.city)}&zoom=15" class="w-full h-full border-0 grayscale-[20%] hover:grayscale-0 transition-all" allowfullscreen loading="lazy" title="Carte"></iframe>
<a href="${DATA.mapsUrl}" target="_blank" rel="noopener" class="absolute bottom-6 right-6 px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl shadow-lg font-bold hover:shadow-xl transition"><i class="fa-solid fa-diamond-turn-right mr-2"></i>Itinéraire</a>
</section>`;

const reviewsSection = reviews.length > 0 ? `<section class="py-24 bg-white">
<div class="max-w-7xl mx-auto px-4">
<div class="text-center mb-16 reveal">
<h2 class="font-display text-4xl font-bold">Ils nous font <span class="text-${tw}-600 italic">confiance</span></h2>
<div class="flex items-center justify-center gap-2 mt-4"><span class="text-yellow-500">${renderStars(DATA.rating)}</span><span class="font-black">${DATA.rating}/5</span><span class="text-slate-400">(${DATA.reviews_count} avis Google)</span></div>
</div>
<div class="grid md:grid-cols-3 gap-6">
${reviews.map(r => `<div class="card-premium p-6 reveal">
<div class="flex items-center gap-3 mb-4">
<div class="w-11 h-11 icon-box rounded-full flex items-center justify-center text-white font-bold">${esc((r.author_name || 'C')[0].toUpperCase())}</div>
<div><div class="font-bold text-slate-900">${esc(r.author_name || 'Client')}</div><div class="text-yellow-500 text-sm">${renderStars(r.rating || 5)}</div></div>
</div>
<p class="text-slate-600 italic text-sm">"${esc((r.text || '').substring(0, 160))}${(r.text || '').length > 160 ? '…' : ''}"</p>
</div>`).join('')}
</div>
</div>
</section>` : '';

const commonScripts = `<script>
const navbar=document.getElementById('navbar');
if(navbar&&!navbar.classList.contains('glass')){
  window.addEventListener('scroll',()=>{
    const on=window.scrollY>80;
    navbar.classList.toggle('glass',on);navbar.classList.toggle('shadow-lg',on);
    navbar.querySelectorAll('.nav-link').forEach(el=>{el.classList.toggle('text-slate-600',on);el.classList.toggle('text-white/90',!on);});
    navbar.querySelector('.logo-text')?.classList.toggle('text-slate-900',on);
    navbar.querySelector('.logo-text')?.classList.toggle('text-white',!on);
    const burger=navbar.querySelector('button.lg\\\\:hidden');if(burger){burger.classList.toggle('text-slate-700',on);burger.classList.toggle('text-white',!on);}
  });
}
document.querySelectorAll('a[href^="#"]').forEach(a=>{a.addEventListener('click',e=>{const h=a.getAttribute('href');if(h!=='#'){const t=document.querySelector(h);if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});document.getElementById('mobile-menu')?.classList.add('hidden');}}});});
const obs=new IntersectionObserver(entries=>{entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('active');obs.unobserve(en.target);}});},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
document.querySelectorAll('.faq-question').forEach(btn=>{btn.addEventListener('click',()=>btn.closest('.faq-item').classList.toggle('active'));});
<\/script>`;

console.log('✅ CSS et composants générés');

// ═══════════════════════════════════════════════════════════════════════════
// FORMULAIRE MULTI-ÉTAPES (rendu + moteur JS avec validation par étape)
// ═══════════════════════════════════════════════════════════════════════════

const renderField = (field) => {
  const req = field.required ? ' *' : '';
  const reqAttr = field.required ? 'required' : '';
  const wrap = (inner, full) => `<div class="mb-4 ${full ? 'full' : ''}">${inner}</div>`;

  if (field.type === 'cards') {
    return wrap(`<label class="form-label">${esc(field.label)}${req}</label>
<div class="choice-cards" data-required="${field.required ? '1' : '0'}">
${field.options.map(opt => `<div class="choice-card" data-value="${esc(opt.value)}" onclick="selectCard(this,'${field.name}')"><div class="choice-icon"><i class="fa-solid ${opt.icon}"></i></div><div class="choice-title">${esc(opt.label)}</div>${opt.desc ? `<div class="choice-desc">${esc(opt.desc)}</div>` : ''}</div>`).join('')}
</div>
<input type="hidden" name="${field.name}" id="field_${field.name}" ${reqAttr}>`, true);
  }
  if (field.type === 'toggle') {
    return wrap(`<label class="form-label">${esc(field.label)}</label>
<div class="toggle-group">
${field.options.map((opt, i) => `<div class="toggle-option ${i === 0 ? 'active' : ''}" data-value="${esc(opt)}" onclick="selectToggle(this,'${field.name}')">${esc(opt)}</div>`).join('')}
</div>
<input type="hidden" name="${field.name}" id="field_${field.name}" value="${esc(field.options[0])}">`, true);
  }
  if (field.type === 'multiselect') {
    return wrap(`<label class="form-label">${esc(field.label)}</label>
<div class="multiselect-chips">
${field.options.map(opt => `<div class="multiselect-chip" data-value="${esc(opt)}" onclick="toggleChip(this,'${field.name}')">${esc(opt)}</div>`).join('')}
</div>
<input type="hidden" name="${field.name}" id="field_${field.name}">`, true);
  }
  if (field.type === 'select') {
    return wrap(`<label class="form-label">${esc(field.label)}${req}</label>
<select name="${field.name}" class="form-input cursor-pointer" ${reqAttr}><option value="">Sélectionner…</option>${field.options.map(opt => `<option value="${esc(opt)}">${esc(opt)}</option>`).join('')}</select>`, !field.half);
  }
  if (field.type === 'textarea') {
    return wrap(`<label class="form-label">${esc(field.label)}${req}</label>
<textarea name="${field.name}" class="form-input resize-none" rows="${field.rows || 4}" placeholder="${esc(field.placeholder || '')}" ${reqAttr}></textarea>`, true);
  }
  return wrap(`<label class="form-label">${esc(field.label)}${req}</label>
<input type="${field.type}" name="${field.name}" class="form-input" placeholder="${esc(field.placeholder || '')}" ${reqAttr} ${field.type === 'tel' ? 'inputmode="tel"' : ''}>`, !field.half);
};

const generateFormHTML = (formId) => {
  const fc = formConfig;
  const stepsCount = fc.steps.length;
  const stepsHTML = fc.steps.map((step, idx) => `<div class="form-step ${idx === 0 ? 'active' : ''}" data-step="${idx}">
<div class="text-center mb-8"><div class="w-16 h-16 icon-box rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4"><i class="fa-solid ${step.icon}"></i></div><h3 class="text-xl font-bold text-slate-900">${esc(step.title)}</h3></div>
<div class="form-grid">${step.fields.map(renderField).join('')}</div>
</div>`).join('');

  return `<div class="form-container" id="${formId}">
<div class="progress-bar"><div class="progress-fill" style="width:${Math.round(100 / stepsCount)}%"></div></div>
<div class="steps-indicator">
${fc.steps.map((step, idx) => `<div class="step-wrap relative flex flex-col items-center ${idx === 0 ? 'active' : ''}"><div class="step-dot ${idx === 0 ? 'active' : ''}">${idx + 1}</div><span class="step-label">${esc(step.title)}</span></div>`).join('')}
</div>
<form onsubmit="submitMultiForm(event,'${formId}')" novalidate>
${stepsHTML}
<div class="form-error-msg"><i class="fa-solid fa-circle-exclamation mr-1"></i>Merci de compléter les champs obligatoires.</div>
<div class="flex justify-between items-center mt-8 pt-6 border-t border-slate-100 gap-3">
<button type="button" class="btn-prev hidden" onclick="prevStep('${formId}')"><i class="fa-solid fa-arrow-left mr-2"></i>Retour</button>
<div class="flex-1"></div>
<button type="button" class="btn-next btn-next-step" onclick="nextStep('${formId}')">Continuer<i class="fa-solid fa-arrow-right ml-2"></i></button>
<button type="submit" class="btn-next btn-submit hidden"><i class="fa-solid fa-paper-plane mr-2"></i>${esc(fc.cta)}</button>
</div>
<div class="mt-6 hidden rgpd-box">
<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" name="rgpd" class="mt-1 w-5 h-5 accent-${tw}-600"><span class="text-xs text-slate-500">J'accepte que mes données soient utilisées pour traiter ma demande. *</span></label>
</div>
</form>
</div>`;
};

const formScripts = `<script>
const FORM_STATE={};
function fState(id){if(!FORM_STATE[id])FORM_STATE[id]={step:0,total:document.querySelectorAll('#'+id+' .form-step').length};return FORM_STATE[id];}
function updateUI(id){
  const st=fState(id),root=document.getElementById(id);
  root.querySelectorAll('.form-step').forEach((s,i)=>s.classList.toggle('active',i===st.step));
  root.querySelectorAll('.step-wrap').forEach((w,i)=>{
    const dot=w.querySelector('.step-dot');w.classList.remove('active','completed');dot.classList.remove('active','completed');
    if(i<st.step){w.classList.add('completed');dot.classList.add('completed');dot.innerHTML='<i class="fa-solid fa-check text-sm"></i>';}
    else{dot.textContent=i+1;if(i===st.step){w.classList.add('active');dot.classList.add('active');}}
  });
  root.querySelector('.progress-fill').style.width=((st.step+1)/st.total*100)+'%';
  const last=st.step===st.total-1;
  root.querySelector('.btn-prev').classList.toggle('hidden',st.step===0);
  root.querySelector('.btn-next-step').classList.toggle('hidden',last);
  root.querySelector('.btn-submit').classList.toggle('hidden',!last);
  root.querySelector('.rgpd-box').classList.toggle('hidden',!last);
  root.querySelector('.form-error-msg').classList.remove('show');
  root.scrollIntoView({behavior:'smooth',block:'start'});
}
function validateStep(id){
  const root=document.getElementById(id),st=fState(id),step=root.querySelectorAll('.form-step')[st.step];
  let ok=true;
  step.querySelectorAll('[required]').forEach(el=>{
    el.classList.remove('field-error');
    const v=(el.value||'').trim();
    let bad=!v;
    if(!bad&&el.type==='email')bad=!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v);
    if(!bad&&el.type==='tel')bad=v.replace(/\\D/g,'').length<9;
    if(bad){ok=false;if(el.type==='hidden'){el.previousElementSibling?.classList.add('field-error');el.previousElementSibling?.querySelectorAll('.choice-card').forEach(c=>c.classList.add('field-error'));}else el.classList.add('field-error');}
  });
  root.querySelector('.form-error-msg').classList.toggle('show',!ok);
  return ok;
}
function nextStep(id){const st=fState(id);if(!validateStep(id))return;if(st.step<st.total-1){st.step++;updateUI(id);}}
function prevStep(id){const st=fState(id);if(st.step>0){st.step--;updateUI(id);}}
function selectCard(el,name){const grid=el.parentElement;grid.querySelectorAll('.choice-card').forEach(c=>c.classList.remove('selected','field-error'));grid.classList.remove('field-error');el.classList.add('selected');grid.parentElement.querySelector('#field_'+name).value=el.dataset.value;}
function selectToggle(el,name){el.parentElement.querySelectorAll('.toggle-option').forEach(t=>t.classList.remove('active'));el.classList.add('active');el.parentElement.parentElement.querySelector('#field_'+name).value=el.dataset.value;}
function toggleChip(el,name){el.classList.toggle('selected');const sel=[...el.parentElement.querySelectorAll('.selected')].map(c=>c.dataset.value);el.parentElement.parentElement.querySelector('#field_'+name).value=sel.join(', ');}
function submitMultiForm(e,id){
  e.preventDefault();
  if(!validateStep(id))return;
  const root=document.getElementById(id),form=e.target,btn=root.querySelector('.btn-submit'),rgpd=form.querySelector('[name=rgpd]');
  if(!rgpd.checked){rgpd.focus();root.querySelector('.form-error-msg').classList.add('show');return;}
  const orig=btn.innerHTML;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-2"></i>Envoi…';btn.disabled=true;
  const data={site_slug:'${DATA.slug}',site_name:${JSON.stringify(DATA.name)},type:'${serviceType}',sector_label:${JSON.stringify(S.label)},form_type:${JSON.stringify(formConfig.title)},page:location.pathname.split('/').pop()||'index.html',date:new Date().toLocaleString('fr-FR')};
  new FormData(form).forEach((v,k)=>{if(v&&k!=='rgpd')data[k]=v;});
  fetch('${WEBHOOK_URL}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  .then(r=>{if(!r.ok)throw new Error();btn.innerHTML='<i class="fa-solid fa-check mr-2"></i>Envoyé !';showSuccessModal();})
  .catch(()=>{btn.innerHTML=orig;btn.disabled=false;alert('Erreur lors de l\\'envoi. Veuillez réessayer ou nous appeler.');});
}
function showSuccessModal(){
  const m=document.createElement('div');
  m.className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4';
  m.innerHTML='<div class="bg-white p-10 rounded-[2rem] text-center max-w-md shadow-2xl"><div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><i class="fa-solid fa-check text-green-600 text-3xl"></i></div><h3 class="text-2xl font-extrabold text-slate-900 mb-3">Demande envoyée !</h3><p class="text-slate-500 mb-8">${esc(content.success_message || 'Nous vous recontactons sous 24h maximum.')}</p><button onclick="this.closest(\\'.fixed\\').remove()" class="px-10 py-4 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-bold hover:shadow-lg transition">Parfait !</button></div>';
  document.body.appendChild(m);
}
<\/script>`;

console.log('✅ Générateur de formulaire prêt');

// ═══════════════════════════════════════════════════════════════════════════
// PAGE INDEX
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_INDEX = headHTML(C.heroTitle + ' à ' + DATA.city, C.heroDesc) + `
<body class="bg-slate-50 text-slate-900 antialiased">
${navHTML('accueil')}

<section class="relative min-h-screen flex items-center overflow-hidden">
<div class="absolute inset-0">
<img src="${esc(heroPhoto)}" alt="${esc(DATA.name)}" class="w-full h-full object-cover">
<div class="absolute inset-0 hero-gradient"></div>
<div class="absolute inset-0 hero-pattern"></div>
</div>
<div class="relative z-10 max-w-7xl mx-auto px-4 py-32 lg:py-36 grid lg:grid-cols-2 gap-12 items-center">
<div class="text-white">
<div class="inline-flex items-center gap-3 py-2 px-5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-semibold mb-8 animate-slideUp">
<span class="text-yellow-400">${renderStars(DATA.rating)}</span>
<span>${DATA.rating}/5 · ${DATA.reviews_count} avis Google</span>
</div>
<p class="text-${tw}-400 font-bold uppercase text-xs tracking-[0.3em] mb-4 animate-slideUp">${esc(S.label)}</p>
<h1 class="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slideUp delay-100 leading-tight">
${esc(C.heroTitle)}
<span class="block mt-3 text-${tw}-400 italic">à ${esc(DATA.city)}</span>
</h1>
<p class="text-xl text-white/80 mb-8 max-w-xl animate-slideUp delay-200">${esc(C.heroSubtitle)}</p>
<div class="grid grid-cols-2 gap-3 mb-10 max-w-lg animate-slideUp delay-300">
${C.badges.slice(0, 4).map(v => `<span class="flex items-center gap-2 text-white/80 text-sm"><i class="fa-solid fa-circle-check text-${tw}-400"></i>${esc(v)}</span>`).join('')}
</div>
<div class="flex items-center gap-8 pt-8 border-t border-white/10 animate-slideUp delay-400">
${S.stats.slice(0, 3).map(s => `<div><div class="text-3xl font-black text-white">${esc(s.value)}</div><div class="text-[10px] uppercase font-bold text-${tw}-400 tracking-widest mt-1">${esc(s.label)}</div></div>`).join('')}
</div>
</div>

<div id="rdv" class="animate-slideUp delay-300">
<div class="glass-card rounded-[2rem] shadow-2xl overflow-hidden">
<div class="bg-gradient-to-r ${colors.gradient} p-6 text-white">
<div class="flex items-center gap-4">
<div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl animate-float"><i class="fa-solid ${S.icon}"></i></div>
<div><h3 class="text-xl font-bold">${esc(formConfig.title)}</h3><p class="text-white/80 text-sm">${esc(formConfig.subtitle)}</p></div>
</div>
</div>
<div class="p-6 lg:p-8">${generateFormHTML('formHero')}</div>
<div class="bg-slate-50 border-t border-slate-100 p-4">
<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
${DATA.phone ? `<a href="${phoneHref}" class="flex items-center gap-2 p-2 bg-white rounded-xl hover:shadow-md transition justify-center"><i class="fa-solid fa-phone text-${tw}-600"></i><span class="font-bold text-slate-900 text-xs">${esc(DATA.phoneFmt)}</span></a>` : '<div></div>'}
<div class="flex items-center gap-2 p-2 bg-white rounded-xl justify-center"><i class="fa-solid fa-location-dot text-${tw}-600"></i><span class="font-bold text-slate-900 text-xs">${esc(DATA.city)}</span></div>
<div class="flex items-center gap-2 p-2 bg-white rounded-xl justify-center"><i class="fa-solid fa-clock text-${tw}-600"></i><span class="font-bold text-slate-900 text-xs">${esc(DATA.horaires.split(',')[0])}</span></div>
<div class="flex items-center gap-2 p-2 bg-white rounded-xl justify-center"><i class="fa-solid fa-star text-yellow-500"></i><span class="font-bold text-slate-900 text-xs">${DATA.rating}/5</span></div>
</div>
</div>
</div>
</div>
</div>
</section>

<section class="bg-white py-8 border-b border-slate-100">
<div class="max-w-7xl mx-auto px-4">
<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
${C.badges.slice(0, 4).map((b, i) => `<div class="flex items-center justify-center gap-3 py-3 reveal"><div class="w-12 h-12 bg-${tw}-50 rounded-2xl flex items-center justify-center text-${tw}-600"><i class="fa-solid ${S.values[i]?.icon || 'fa-check'}"></i></div><span class="font-semibold text-slate-700 text-sm">${esc(b)}</span></div>`).join('')}
</div>
</div>
</section>

<section class="py-24 bg-slate-50">
<div class="max-w-7xl mx-auto px-4">
${sectionHeadHTML(S.servicesTag, S.servicesTitle)}
${servicesGrid(true)}
<div class="text-center mt-12 reveal"><a href="services.html" class="inline-flex items-center gap-2 px-7 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-${tw}-600 transition">Voir tous nos ${esc(S.nav.services.toLowerCase())} <i class="fa-solid fa-arrow-right"></i></a></div>
</div>
</section>

${highlightSection()}

${processSection('bg-white')}

${statsSection}

<section class="py-24 bg-white">
<div class="max-w-7xl mx-auto px-4">
<div class="grid lg:grid-cols-2 gap-16 items-center">
<div class="relative reveal">
<img src="${esc(officePhoto)}" alt="${esc(DATA.name)}" class="rounded-[2rem] shadow-2xl w-full object-cover aspect-[4/3]" loading="lazy">
<div class="absolute -bottom-5 -right-5 bg-white p-5 rounded-2xl shadow-xl">
<div class="text-3xl font-black text-${tw}-600">${DATA.rating}/5</div>
<div class="text-yellow-400 text-sm">${renderStars(DATA.rating)}</div>
<div class="text-[10px] uppercase font-bold text-slate-400 mt-1">${DATA.reviews_count} avis</div>
</div>
</div>
<div class="reveal">
<span class="inline-block text-${tw}-600 font-bold uppercase text-xs tracking-[0.3em] mb-4 py-2 px-6 bg-${tw}-50 rounded-full">${esc(S.about.tag)}</span>
<h2 class="font-display text-4xl font-bold text-slate-900 mb-6">${em(C.aboutTitle)}</h2>
<p class="text-slate-500 text-lg mb-4">${esc(C.aboutText)}</p>
<p class="text-slate-500 mb-8">${esc(C.aboutText2)}</p>
<div class="grid grid-cols-2 gap-4 mb-8">
${S.values.map(v => `<div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><i class="fa-solid ${v.icon} text-${tw}-500"></i><span class="font-medium text-sm">${esc(v.title)}</span></div>`).join('')}
</div>
<a href="cabinet.html" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-${tw}-600 transition">Découvrir ${esc(S.nav.about.toLowerCase())} <i class="fa-solid fa-arrow-right"></i></a>
</div>
</div>
</div>
</section>

${reviewsSection}
${faqSection('bg-slate-50')}
${ctaSection}
${mapSection}
${footerHTML}
${purchaseBarHTML}
${commonScripts}
${formScripts}
</body></html>`;

console.log('✅ PAGE INDEX générée');

// ═══════════════════════════════════════════════════════════════════════════
// PAGES SECONDAIRES
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SERVICES = headHTML(S.nav.services, `${S.nav.services} de ${DATA.name} à ${DATA.city} : ${services.map(s => s.name).join(', ')}.`) + `
<body class="bg-slate-50 text-slate-900 antialiased">
${navHTML('services')}
${pageHeroHTML(S.servicesTag, 'Nos <em>' + S.nav.services.toLowerCase() + '</em>')}
<section class="py-24"><div class="max-w-7xl mx-auto px-4">${servicesGrid(false)}</div></section>
${highlightSection()}
${processSection('bg-white')}
${faqSection('bg-slate-50')}
${ctaSection}${footerHTML}${purchaseBarHTML}${commonScripts}
</body></html>`;

const PAGE_CABINET = headHTML(S.nav.about, `${S.label} ${DATA.name} à ${DATA.city} : notre histoire, nos valeurs, notre équipe.`) + `
<body class="bg-slate-50 text-slate-900 antialiased">
${navHTML('cabinet')}
${pageHeroHTML(S.about.tag, S.nav.about.replace(/^(Le |L'|À )/, '$1<em>') + '</em>')}
<section class="py-24 bg-white">
<div class="max-w-7xl mx-auto px-4">
<div class="grid lg:grid-cols-2 gap-16 items-center">
<div class="reveal">
<span class="inline-block text-${tw}-600 font-bold uppercase text-xs tracking-[0.3em] mb-4 py-2 px-6 bg-${tw}-50 rounded-full">${esc(S.about.tag)}</span>
<h2 class="font-display text-4xl font-bold mb-6">${em(C.aboutTitle)}</h2>
<p class="text-slate-500 text-lg mb-4">${esc(C.aboutText)}</p>
<p class="text-slate-500 mb-8">${esc(C.aboutText2)}</p>
<div class="flex flex-wrap gap-3">${C.badges.map(v => `<span class="px-4 py-2 bg-${tw}-50 text-${tw}-700 rounded-full text-sm font-bold">${esc(v)}</span>`).join('')}</div>
</div>
<div class="relative reveal"><img src="${esc(officePhoto)}" alt="${esc(DATA.name)}" class="rounded-[2rem] shadow-2xl w-full object-cover aspect-[4/3]" loading="lazy"></div>
</div>
</div>
</section>
${valuesSection('bg-slate-50')}
${statsSection}
${galleryPhotos.length >= 2 ? `<section class="py-24 bg-white"><div class="max-w-7xl mx-auto px-4">${sectionHeadHTML('En images', 'Découvrez <em>nos locaux</em>')}<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">${galleryPhotos.map(p => `<div class="gallery-item reveal"><img src="${esc(p)}" alt="${esc(DATA.name)}" loading="lazy"></div>`).join('')}</div></div></section>` : ''}
${reviewsSection}
${ctaSection}${footerHTML}${purchaseBarHTML}${commonScripts}
</body></html>`;

const PAGE_CONTACT = headHTML('Contact', `Contactez ${DATA.name} à ${DATA.city}. ${formConfig.subtitle}.`) + `
<body class="bg-slate-50 text-slate-900 antialiased">
${navHTML('contact')}
${pageHeroHTML('Contact', 'Prenons <em>contact</em>')}
<section id="rdv" class="py-24">
<div class="max-w-7xl mx-auto px-4">
<div class="grid lg:grid-cols-5 gap-8">
<div class="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-[2rem] p-10 relative overflow-hidden reveal">
<div class="absolute top-0 right-0 w-64 h-64 bg-${tw}-500/10 rounded-full blur-3xl"></div>
<div class="relative z-10">
<h3 class="font-display text-2xl font-bold mb-2">${esc(DATA.name)}</h3>
<p class="text-${tw}-400 italic mb-8">${esc(S.label)} · ${esc(DATA.city)}</p>
<div class="space-y-6">
<div class="flex items-start gap-4"><div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-${tw}-400 shrink-0"><i class="fa-solid fa-location-dot"></i></div><div><span class="text-xs font-bold uppercase text-${tw}-400 block mb-1">Adresse</span><span class="text-white">${esc(DATA.address || DATA.city)}</span></div></div>
${DATA.phone ? `<a href="${phoneHref}" class="flex items-start gap-4 group"><div class="w-12 h-12 bg-white/10 group-hover:bg-${tw}-500 rounded-xl flex items-center justify-center text-${tw}-400 group-hover:text-white transition shrink-0"><i class="fa-solid fa-phone"></i></div><div><span class="text-xs font-bold uppercase text-${tw}-400 block mb-1">Téléphone</span><span class="text-white">${esc(DATA.phoneFmt)}</span></div></a>` : ''}
${DATA.email ? `<a href="mailto:${esc(DATA.email)}" class="flex items-start gap-4 group"><div class="w-12 h-12 bg-white/10 group-hover:bg-${tw}-500 rounded-xl flex items-center justify-center text-${tw}-400 group-hover:text-white transition shrink-0"><i class="fa-solid fa-envelope"></i></div><div><span class="text-xs font-bold uppercase text-${tw}-400 block mb-1">Email</span><span class="text-white break-all">${esc(DATA.email)}</span></div></a>` : ''}
<div class="flex items-start gap-4"><div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-${tw}-400 shrink-0"><i class="fa-solid fa-clock"></i></div><div><span class="text-xs font-bold uppercase text-${tw}-400 block mb-1">Horaires</span><span class="text-white">${esc(DATA.horaires)}</span></div></div>
</div>
<div class="mt-10 pt-8 border-t border-white/10">
<div class="flex items-center gap-2 text-yellow-400 mb-1">${renderStars(DATA.rating)}<span class="text-white font-bold ml-1">${DATA.rating}/5</span></div>
<p class="text-slate-400 text-xs">${DATA.reviews_count} avis Google</p>
</div>
</div>
</div>
<div class="lg:col-span-3 bg-white rounded-[2rem] shadow-xl overflow-hidden reveal">
<div class="bg-gradient-to-r ${colors.gradient} p-6 text-white"><h3 class="text-xl font-bold">${esc(formConfig.title)}</h3><p class="text-white/80 text-sm">${esc(formConfig.subtitle)}</p></div>
<div class="p-8">${generateFormHTML('formContact')}</div>
</div>
</div>
</div>
</section>
${faqSection('bg-white')}
${mapSection}
${footerHTML}${purchaseBarHTML}${commonScripts}${formScripts}
</body></html>`;

console.log('✅ Pages secondaires générées');

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

const pages = {
  'index.html': PAGE_INDEX,
  'services.html': PAGE_SERVICES,
  'cabinet.html': PAGE_CABINET,
  'contact.html': PAGE_CONTACT
};

console.log('════════════════════════════════════════════════════════════════');
console.log('✅ SERVICE V12 SECTORS - 4 pages');
console.log('   Secteur:', serviceType, '|', S.label, '| Couleur:', tw);
console.log('   Formulaire:', formConfig.title, '(', formConfig.steps.length, 'étapes)');
console.log('   Section signature:', S.highlight.tag);
console.log('════════════════════════════════════════════════════════════════');

return [{
  json: {
    ...prepData,
    pages: pages,
    html: PAGE_INDEX,
    html_content: PAGE_INDEX,
    preview_url: siteUrl,
    template_used: 'SERVICE_V12_SECTORS',
    pages_count: 4,
    service_type: serviceType,
    sector_label: S.label,
    form_steps: formConfig.steps.length
  }
}];
