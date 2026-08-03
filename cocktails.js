// ── The Rail — cocktail data + ingredient matching engine ─────────────
// Pure data/logic, no DOM or Firebase calls in here.
// Everything is exposed on window.Rail so app.js can use it.

(function () {

  const CATEGORIES = [
    { id: 'Whiskey',                  label: 'Whiskey',                  emoji: '🥃' },
    { id: 'Rye',                      label: 'Rye',                      emoji: '🌾' },
    { id: 'Gin',                      label: 'Gin',                      emoji: '🌿' },
    { id: 'Vodka',                    label: 'Vodka',                    emoji: '❄️' },
    { id: 'White/Light Rum',          label: 'White / Light Rum',        emoji: '🏝️' },
    { id: 'Dark Rum',                 label: 'Dark Rum',                 emoji: '🛢️' },
    { id: 'Tequila',                  label: 'Tequila',                  emoji: '🌵' },
    { id: 'Mezcal',                   label: 'Mezcal',                   emoji: '💨' },
    { id: 'Cognac',                   label: 'Cognac / Brandy',          emoji: '🍂' },
    { id: 'Apple Brandy',             label: 'Apple Brandy',             emoji: '🍎' },
    { id: 'Orange Liqueur',           label: 'Orange Liqueur',           emoji: '🍊' },
    { id: 'Campari',                  label: 'Campari',                  emoji: '🔴' },
    { id: 'Aperol',                   label: 'Aperol',                   emoji: '🧡' },
    { id: 'Coffee Liqueur',           label: 'Coffee Liqueur',           emoji: '☕' },
    { id: 'Liqueur (Other)',          label: 'Liqueur (Other)',          emoji: '🍯' },
    { id: 'Sweet Vermouth',           label: 'Sweet Vermouth',           emoji: '🍇' },
    { id: 'Dry Vermouth',             label: 'Dry Vermouth',             emoji: '🫒' },
    { id: 'Fortified Wine',           label: 'Fortified Wine',           emoji: '🍶' },
    { id: 'Wine',                     label: 'Wine',                     emoji: '🍷' },
    { id: 'Champagne/Sparkling',      label: 'Champagne / Sparkling',    emoji: '🥂' },
    { id: 'Beer/Cider',               label: 'Beer / Cider',             emoji: '🍺' },
    { id: 'Bitters',                  label: 'Bitters',                  emoji: '💧' },
    { id: 'Other',                    label: 'Other',                    emoji: '🍸' },
  ];

  const LEVELS = ['full', 'low', 'empty'];

  // Categories pulled into their own "Wine List" section on the Inventory
  // tab instead of the general bar shelf grouping.
  const WINE_CATEGORIES = ['Wine', 'Champagne/Sparkling'];

  const DEFAULT_MIXERS = [
    { id: 'tonic-water',       name: 'Tonic Water' },
    { id: 'soda-water',        name: 'Soda Water' },
    { id: 'ginger-beer',       name: 'Ginger Beer' },
    { id: 'cola',              name: 'Cola' },
    { id: 'lime',              name: 'Lime' },
    { id: 'lemon',             name: 'Lemon' },
    { id: 'orange-juice',      name: 'Orange Juice' },
    { id: 'grapefruit-juice',  name: 'Grapefruit Juice' },
    { id: 'simple-syrup',      name: 'Simple Syrup' },
    { id: 'cream',             name: 'Cream' },
    { id: 'prosecco',          name: 'Prosecco' },
    { id: 'espresso',          name: 'Espresso' },
    { id: 'grenadine',         name: 'Grenadine' },
  ];

  // ── Curated "house" recipes ────────────────────────────────────────
  // required: category ids that must have a non-empty bottle
  // required: { category, amount, note? } — a bottle checked against
  //            stock, OR { mixer, amount } — an essential mixer checked
  //            against the mixers list. Either way it counts toward
  //            Ready/Missing, since the drink doesn't work without it.
  //            note overrides the generic category label for display
  //            when a specific ingredient is customary (e.g. Prosecco
  //            for a Champagne/Sparkling slot); matching still checks
  //            the whole category — note is display-only.
  // optional: { item, amount } — a true garnish. Never blocks Ready.
  const CURATED_RECIPES = [
    { name: 'Old Fashioned',
      required: [{ category: 'Whiskey', amount: '2 oz' }, { category: 'Bitters', amount: '2-3 dashes' }, { mixer: 'simple-syrup', amount: '1/4 oz' }],
      optional: [{ item: 'orange peel', amount: '1 twist' }, { item: 'cherry', amount: '1' }],
      instructions: 'In a rocks glass, stir 1/4 oz simple syrup with 2-3 dashes bitters and a splash of water until combined. Add 2 oz whiskey and a large ice cube, stir 20–30 seconds to chill. Express an orange twist over the top and drop it in.' },
    { name: 'Manhattan',
      required: [{ category: 'Whiskey', amount: '2 oz' }, { category: 'Sweet Vermouth', amount: '1 oz' }, { category: 'Bitters', amount: '2 dashes' }],
      optional: [{ item: 'cherry', amount: '1' }],
      instructions: 'Stir 2 oz whiskey, 1 oz sweet vermouth, and 2 dashes bitters with ice in a mixing glass for 20–30 seconds. Strain into a chilled coupe. Garnish with a cherry.' },
    { name: 'Whiskey Sour',
      required: [{ category: 'Whiskey', amount: '2 oz' }, { mixer: 'lemon', amount: '3/4 oz' }, { mixer: 'simple-syrup', amount: '3/4 oz' }],
      optional: [],
      instructions: 'Shake 2 oz whiskey, 3/4 oz lemon juice, and 3/4 oz simple syrup hard with ice for 10–15 seconds. Strain over fresh ice in a rocks glass.' },
    { name: 'Boulevardier',
      required: [{ category: 'Whiskey', amount: '1 oz' }, { category: 'Campari', amount: '1 oz' }, { category: 'Sweet Vermouth', amount: '1 oz' }],
      optional: [{ item: 'orange peel', amount: '1 twist' }],
      instructions: 'Stir 1 oz whiskey, 1 oz Campari, and 1 oz sweet vermouth with ice for 20–30 seconds. Strain into a rocks glass over ice. Garnish with an orange twist.' },
    { name: 'Martini',
      required: [{ category: 'Gin', amount: '2 oz' }, { category: 'Dry Vermouth', amount: '1/2 oz' }],
      optional: [{ item: 'olive', amount: '1-2' }, { item: 'lemon', amount: '1 twist' }],
      instructions: 'Stir 2 oz gin and 1/2 oz dry vermouth with plenty of ice for 20–30 seconds. Strain into a chilled coupe or Martini glass. Garnish with an olive or lemon twist.' },
    { name: 'Negroni',
      required: [{ category: 'Gin', amount: '1 oz' }, { category: 'Campari', amount: '1 oz' }, { category: 'Sweet Vermouth', amount: '1 oz' }],
      optional: [{ item: 'orange peel', amount: '1 twist' }],
      instructions: 'Stir 1 oz gin, 1 oz Campari, and 1 oz sweet vermouth with ice for 20–30 seconds. Strain into a rocks glass over fresh ice. Garnish with an orange twist.' },
    { name: 'Gin & Tonic',
      required: [{ category: 'Gin', amount: '2 oz' }, { mixer: 'tonic-water', amount: '4-5 oz' }],
      optional: [{ item: 'lime', amount: '1 wedge' }],
      instructions: 'Fill a highball glass with ice. Add 2 oz gin, top with 4-5 oz tonic water, and stir gently. Garnish with a lime wedge.' },
    { name: 'Tom Collins',
      required: [{ category: 'Gin', amount: '2 oz' }, { mixer: 'lemon', amount: '3/4 oz' }, { mixer: 'simple-syrup', amount: '1/2 oz' }, { mixer: 'soda-water', amount: 'top' }],
      optional: [],
      instructions: 'Shake 2 oz gin, 3/4 oz lemon juice, and 1/2 oz simple syrup with ice. Strain into a Collins glass over fresh ice and top with soda water. Stir gently.' },
    { name: 'Daiquiri',
      required: [{ category: 'White/Light Rum', amount: '2 oz' }, { mixer: 'lime', amount: '3/4 oz' }, { mixer: 'simple-syrup', amount: '3/4 oz' }],
      optional: [],
      instructions: 'Shake 2 oz white rum, 3/4 oz lime juice, and 3/4 oz simple syrup hard with ice for 10–15 seconds. Strain into a chilled coupe.' },
    { name: 'Mojito',
      required: [{ category: 'White/Light Rum', amount: '2 oz' }, { mixer: 'lime', amount: '3/4 oz' }, { mixer: 'simple-syrup', amount: '3/4 oz' }, { mixer: 'soda-water', amount: 'top' }, { mixer: 'mint', amount: '8-10 leaves' }],
      optional: [],
      instructions: 'Muddle 8-10 mint leaves with 3/4 oz simple syrup and 3/4 oz lime juice in a highball glass. Add 2 oz rum and fill with crushed ice, stir. Top with soda water and garnish with a mint sprig.' },
    { name: "Dark 'n' Stormy",
      required: [{ category: 'Dark Rum', amount: '2 oz' }, { mixer: 'ginger-beer', amount: '4-5 oz' }],
      optional: [{ item: 'lime', amount: '1 wedge' }],
      instructions: 'Fill a highball glass with ice. Add 2 oz dark rum, top with 4-5 oz ginger beer, and stir gently. Garnish with a lime wedge.' },
    { name: 'Margarita',
      required: [{ category: 'Tequila', amount: '2 oz' }, { category: 'Orange Liqueur', amount: '1 oz' }, { mixer: 'lime', amount: '1 oz' }],
      optional: [],
      instructions: 'Shake 2 oz tequila, 1 oz triple sec, and 1 oz lime juice hard with ice. Strain into a salt-rimmed rocks glass over fresh ice (or up in a coupe).' },
    { name: 'Paloma',
      required: [{ category: 'Tequila', amount: '2 oz' }, { mixer: 'grapefruit-juice', amount: '3 oz' }, { mixer: 'soda-water', amount: 'splash' }],
      optional: [{ item: 'lime', amount: '1 wedge' }],
      instructions: 'Fill a highball glass with ice. Add 2 oz tequila and a squeeze of lime, top with 3 oz grapefruit juice (or grapefruit soda) and a splash of soda water. Stir gently.' },
    { name: 'Vodka Martini',
      required: [{ category: 'Vodka', amount: '2 oz' }, { category: 'Dry Vermouth', amount: '1/2 oz' }],
      optional: [{ item: 'olive', amount: '1-2' }, { item: 'lemon', amount: '1 twist' }],
      instructions: 'Stir 2 oz vodka and 1/2 oz dry vermouth with plenty of ice for 20–30 seconds. Strain into a chilled coupe or Martini glass. Garnish with an olive or lemon twist.' },
    { name: 'Moscow Mule',
      required: [{ category: 'Vodka', amount: '2 oz' }, { mixer: 'ginger-beer', amount: '4-5 oz' }],
      optional: [{ item: 'lime', amount: '1 wedge' }],
      instructions: 'Fill a copper mug or highball glass with ice. Add 2 oz vodka and a squeeze of lime, top with 4-5 oz ginger beer, and stir gently. Garnish with a lime wedge.' },
    { name: 'White Russian',
      required: [{ category: 'Vodka', amount: '2 oz' }, { category: 'Coffee Liqueur', amount: '1 oz' }, { mixer: 'cream', amount: '1 oz' }],
      optional: [],
      instructions: 'Fill a rocks glass with ice. Add 2 oz vodka and 1 oz coffee liqueur, stir. Float 1 oz cream on top.' },
    { name: 'Sidecar',
      required: [{ category: 'Cognac', amount: '2 oz' }, { category: 'Orange Liqueur', amount: '1 oz' }, { mixer: 'lemon', amount: '3/4 oz' }],
      optional: [],
      instructions: 'Shake 2 oz cognac, 1 oz triple sec, and 3/4 oz lemon juice hard with ice. Strain into a chilled, sugar-rimmed coupe.' },
    { name: 'Espresso Martini',
      required: [{ category: 'Vodka', amount: '1.5 oz' }, { category: 'Coffee Liqueur', amount: '1/2 oz' }, { mixer: 'espresso', amount: '1 oz' }, { mixer: 'simple-syrup', amount: '1/4 oz' }],
      optional: [],
      instructions: 'Shake 1.5 oz vodka, 1/2 oz coffee liqueur, 1 oz fresh espresso, and 1/4 oz simple syrup hard with ice until well-frothed. Double-strain into a chilled coupe.' },
    { name: 'Aperol Spritz',
      required: [{ category: 'Aperol', amount: '2 oz' }, { category: 'Champagne/Sparkling', amount: '3 oz', note: 'Prosecco' }, { mixer: 'soda-water', amount: 'splash' }],
      optional: [{ item: 'orange', amount: '1 slice' }],
      instructions: 'Fill a wine glass with ice. Add 3 oz prosecco, then 2 oz Aperol, then a splash of soda water. Stir gently and garnish with an orange slice.' },
    { name: 'Mimosa',
      required: [{ category: 'Champagne/Sparkling', amount: '3 oz' }, { mixer: 'orange-juice', amount: '3 oz' }],
      optional: [],
      instructions: 'Pour 3 oz chilled sparkling wine into a champagne flute. Top with 3 oz chilled orange juice.' },
    { name: 'Kir Royale',
      required: [{ category: 'Champagne/Sparkling', amount: '4.5 oz', note: 'Champagne' }, { category: 'Liqueur (Other)', amount: '1/2 oz', note: 'Crème de Cassis' }],
      optional: [],
      instructions: 'Add 1/2 oz crème de cassis to a champagne flute. Top slowly with 4.5 oz chilled champagne.' },
    { name: 'Bellini',
      required: [{ category: 'Champagne/Sparkling', amount: '3 oz', note: 'Prosecco' }, { mixer: 'peach puree', amount: '2 oz' }],
      optional: [],
      instructions: 'Pour 2 oz peach purée into a champagne flute. Top slowly with 3 oz chilled prosecco and stir gently.' },
    { name: 'Sangria',
      required: [{ category: 'Wine', amount: '4 oz per glass' }, { mixer: 'orange-juice', amount: '1 oz per glass' }],
      optional: [{ item: 'orange', amount: 'slices' }, { item: 'lemon', amount: 'slices' }],
      instructions: 'In a pitcher, combine red wine, orange juice, and sliced fruit (roughly 4 oz wine to 1 oz orange juice per serving). Refrigerate at least 2 hours (overnight is better) so the fruit macerates. Serve over ice.' },
    { name: 'Wine Spritzer',
      required: [{ category: 'Wine', amount: '3 oz' }, { mixer: 'soda-water', amount: 'top' }],
      optional: [],
      instructions: 'Fill a wine glass with ice. Add 3 oz chilled white wine and top with soda water. Stir gently.' },
    { name: 'Tequila Sunrise',
      required: [{ category: 'Tequila', amount: '2 oz' }, { mixer: 'orange-juice', amount: '4 oz' }, { mixer: 'grenadine', amount: '1/2 oz' }],
      optional: [],
      instructions: 'Fill a highball glass with ice. Add 2 oz tequila and 4 oz orange juice, stir. Slowly pour 1/2 oz grenadine down the inside of the glass so it settles at the bottom before it "rises."' },
    { name: 'Jack Rose',
      required: [{ category: 'Apple Brandy', amount: '2 oz' }, { mixer: 'lime', amount: '3/4 oz' }, { mixer: 'grenadine', amount: '1/2 oz' }],
      optional: [],
      instructions: 'Shake 2 oz apple brandy, 3/4 oz lime juice, and 1/2 oz grenadine hard with ice. Strain into a chilled coupe.' },
    { name: 'Bacardi Cocktail',
      required: [{ category: 'White/Light Rum', amount: '2 oz' }, { mixer: 'lime', amount: '3/4 oz' }, { mixer: 'grenadine', amount: '1/2 oz' }],
      optional: [],
      instructions: 'Shake 2 oz white rum, 3/4 oz lime juice, and 1/2 oz grenadine hard with ice. Strain into a chilled coupe.' },
    { name: 'Ward Eight',
      required: [{ category: 'Whiskey', amount: '2 oz' }, { mixer: 'lemon', amount: '3/4 oz' }, { mixer: 'orange-juice', amount: '3/4 oz' }, { mixer: 'grenadine', amount: '1/2 oz' }],
      optional: [],
      instructions: 'Shake 2 oz whiskey, 3/4 oz lemon juice, 3/4 oz orange juice, and 1/2 oz grenadine hard with ice. Strain into a chilled coupe or over fresh ice in a rocks glass.' },
  ];

  // ── CocktailDB representative search terms per category ───────────
  // Used to find *candidate* drinks worth checking; the real matching
  // happens afterwards against the full ingredient list.
  const COCKTAILDB_TERMS = {
    'Whiskey':                 ['Bourbon', 'Whiskey', 'Scotch', 'Rye Whiskey'],
    'Gin':                     ['Gin'],
    'Vodka':                   ['Vodka'],
    'White/Light Rum':         ['Light rum', 'White rum'],
    'Dark Rum':                ['Dark rum'],
    'Tequila':                 ['Tequila'],
    'Mezcal':                  ['Mezcal'],
    'Cognac':                  ['Brandy', 'Cognac'],
    'Apple Brandy':            ['Apple brandy', 'Applejack'],
    'Orange Liqueur':          ['Triple sec'],
    'Campari':                 ['Campari'],
    'Aperol':                  ['Aperol'],
    'Coffee Liqueur':          ['Coffee liqueur'],
    'Liqueur (Other)':         ['Amaretto'],
    'Sweet Vermouth':          ['Sweet Vermouth'],
    'Dry Vermouth':            ['Dry Vermouth'],
    'Fortified Wine':          ['Sherry', 'Port'],
    'Wine':                    ['Red wine', 'White wine'],
    'Champagne/Sparkling':     ['Champagne', 'Prosecco'],
    'Beer/Cider':              ['Beer', 'Cider'],
    'Bitters':                 ['Bitters', 'Angostura bitters'],
  };

  // ── Ingredient → bottle category keywords ──────────────────────────
  // Checked in order, most specific first, to avoid collisions
  // (e.g. "ginger ale" must never match Beer/Cider's "ale").
  const FORCE_MIXER_PATTERNS = [
    'ginger ale', 'ginger beer', 'root beer', 'tonic water', 'soda water',
    'club soda', 'cream soda',
  ];

  const CATEGORY_KEYWORDS = [
    ['Bitters', ['bitters']],
    ['Champagne/Sparkling', ['champagne', 'prosecco', 'cava', 'sparkling wine', 'brut']],
    // Dry/Sweet checked before the bare "vermouth" fallback, so a
    // qualified ingredient always wins over the generic default.
    ['Dry Vermouth', ['dry vermouth', 'extra dry vermouth']],
    ['Sweet Vermouth', ['sweet vermouth', 'red vermouth', 'rosso vermouth', 'bianco vermouth', 'vermouth']],
    ['Fortified Wine', ['sherry', 'port', 'madeira', 'lillet', 'dubonnet', 'fortified wine']],
    ['Beer/Cider', ['beer', 'lager', 'ale', 'stout', 'cider']],
    ['Wine', ['red wine', 'white wine', 'rose wine', 'rosé wine', 'wine']],
    ['Whiskey', ['whisky', 'whiskey', 'bourbon', 'scotch', 'rye', 'irish whiskey', 'tennessee whiskey', 'canadian whisky']],
    ['Gin', ['gin']],
    ['Vodka', ['vodka']],
    // Dark checked before the bare "rum" fallback in White/Light.
    ['Dark Rum', ['dark rum', 'black rum', 'aged rum', 'spiced rum', 'gold rum', 'amber rum', 'demerara rum', 'jamaican rum', 'overproof rum']],
    ['White/Light Rum', ['white rum', 'light rum', 'silver rum', 'clear rum', 'coconut rum', 'cachaca', 'cachaça', 'rum']],
    ['Mezcal', ['mezcal']],
    ['Tequila', ['tequila']],
    // Apple Brandy checked before Cognac's bare "brandy" fallback.
    ['Apple Brandy', ['apple brandy', 'applejack', 'calvados']],
    ['Cognac', ['cognac', 'brandy', 'armagnac', 'pisco']],
    ['Campari', ['campari']],
    ['Aperol', ['aperol']],
    ['Coffee Liqueur', ['coffee liqueur', 'kahlua', 'kahlúa', 'tia maria']],
    ['Orange Liqueur', ['triple sec', 'cointreau', 'grand marnier', 'curacao', 'curaçao']],
    ['Liqueur (Other)', [
      'amaretto', 'disaronno', 'chambord', 'creme de cassis', 'crème de cassis',
      'creme de menthe', 'crème de menthe', 'creme de violette', 'crème de violette',
      'creme de cacao', 'crème de cacao', 'benedictine', 'drambuie', 'chartreuse',
      'st germain', 'st-germain', 'elderflower liqueur', 'midori', 'sambuca',
      'frangelico', 'galliano', 'baileys', 'irish cream', 'southern comfort',
      'jagermeister', 'jägermeister', 'maraschino liqueur', 'luxardo',
      'peach schnapps', 'schnapps', 'liqueur', 'amaro',
    ]],
  ];

  // Bare brand names that don't include a generic category word.
  const BRAND_MAP = {
    'jack daniels': 'Whiskey', "jack daniel's": 'Whiskey', 'jim beam': 'Whiskey',
    'wild turkey': 'Whiskey', "maker's mark": 'Whiskey', 'makers mark': 'Whiskey',
    'woodford reserve': 'Whiskey', 'jameson': 'Whiskey', 'johnnie walker': 'Whiskey',
    'crown royal': 'Whiskey',
    'bombay sapphire': 'Gin', 'tanqueray': 'Gin', "hendrick's": 'Gin', 'hendricks': 'Gin',
    'beefeater': 'Gin',
    'smirnoff': 'Vodka', 'grey goose': 'Vodka', 'absolut': 'Vodka', 'stolichnaya': 'Vodka',
    'ketel one': 'Vodka', 'tito\'s': 'Vodka', 'titos': 'Vodka',
    'bacardi': 'White/Light Rum', 'malibu': 'White/Light Rum',
    'captain morgan': 'Dark Rum', 'mount gay': 'Dark Rum',
    'jose cuervo': 'Tequila', 'patron': 'Tequila', 'patrón': 'Tequila',
    'don julio': 'Tequila', 'espolon': 'Tequila',
    'hennessy': 'Cognac', 'remy martin': 'Cognac', 'rémy martin': 'Cognac',
    'courvoisier': 'Cognac',
  };

  // ── Mixer synonym groups: raw ingredient text → canonical mixer id ─
  const MIXER_SYNONYMS = {
    'soda-water':       ['soda water', 'club soda', 'sparkling water', 'carbonated water', 'cream soda'],
    'tonic-water':      ['tonic water', 'tonic'],
    'ginger-beer':      ['ginger beer', 'ginger ale'],
    'cola':             ['cola', 'coke', 'coca-cola', 'coca cola'],
    'lime':             ['lime', 'lime juice', 'lime wedge', 'lime slice'],
    'lemon':            ['lemon', 'lemon juice', 'lemon wedge', 'lemon slice', 'lemon twist'],
    'orange-juice':     ['orange juice', 'oj'],
    'grapefruit-juice': ['grapefruit juice'],
    'simple-syrup':     ['simple syrup', 'sugar syrup', 'sugar', 'superfine sugar', 'powdered sugar'],
    'cream':            ['cream', 'heavy cream', 'half and half', 'milk', 'whipped cream'],
    'prosecco':         ['prosecco'],
    'espresso':         ['espresso', 'coffee'],
    'grenadine':        ['grenadine'],
  };

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordMatch(haystack, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b').test(haystack);
  }

  // Resolve a canonical mixer id from raw ingredient text, if any.
  function resolveMixerId(normalized) {
    for (const [mixerId, synonyms] of Object.entries(MIXER_SYNONYMS)) {
      for (const syn of synonyms) {
        if (normalized === syn || wordMatch(normalized, syn)) return mixerId;
      }
    }
    return null;
  }

  // Classify a raw ingredient name (as it appears on a recipe) into
  // either a bottle category (required) or a mixer (optional).
  // Returns { type: 'bottle', category } or { type: 'mixer', mixerId, label }
  function classifyIngredient(rawName) {
    const normalized = normalize(rawName);

    for (const pattern of FORCE_MIXER_PATTERNS) {
      if (normalized.includes(pattern)) {
        return { type: 'mixer', mixerId: resolveMixerId(normalized), label: rawName };
      }
    }

    for (const [category, keywords] of CATEGORY_KEYWORDS) {
      for (const kw of keywords) {
        if (kw.includes(' ') ? normalized.includes(kw) : wordMatch(normalized, kw)) {
          return { type: 'bottle', category };
        }
      }
    }

    for (const [brand, category] of Object.entries(BRAND_MAP)) {
      if (normalized.includes(brand)) return { type: 'bottle', category };
    }

    return { type: 'mixer', mixerId: resolveMixerId(normalized), label: rawName };
  }

  // Does the user have a mixer matching this raw name/id, present=true?
  function hasMixer(mixersState, mixerIdOrName) {
    if (!mixerIdOrName) return false;
    const norm = normalize(mixerIdOrName).replace(/-/g, ' ');
    for (const m of Object.values(mixersState || {})) {
      if (!m || !m.present) continue;
      const mn = normalize(m.name);
      if (mn === norm || mn.includes(norm) || norm.includes(mn)) return true;
    }
    return false;
  }

  // Restricted bottles (e.g. special-occasion sipping bottles) are tracked
  // but never count as available stock for cocktail matching.
  // Rye is its own category for inventory organization, but rye IS
  // whiskey — any recipe requiring "Whiskey" is satisfied by rye bottles
  // too, so checking the Whiskey category also checks Rye.
  const CATEGORY_GROUPS = {
    Whiskey: ['Whiskey', 'Rye'],
  };

  function hasCategoryStock(bottlesState, category) {
    const matchCategories = CATEGORY_GROUPS[category] || [category];
    return Object.values(bottlesState || {}).some(
      (b) => b && matchCategories.includes(b.category) && b.level !== 'empty' && !b.restricted
    );
  }

  // Compute status for a curated recipe against current inventory state.
  // required entries are either { category, amount, note? } (a bottle —
  // checked against stock levels) or { mixer, amount } (an essential
  // mixer — checked against the mixers list, same as optional items, but
  // counted toward Ready/Missing since the drink doesn't work without
  // it). optional stays reserved for true garnishes, which never block
  // Ready.
  function computeCuratedStatus(recipe, bottlesState, mixersState) {
    const requiredStatus = recipe.required.map((req) => {
      if (req.mixer) {
        const name = DEFAULT_MIXERS.find((m) => m.id === req.mixer)?.name || titleCase(req.mixer);
        return {
          label: (req.amount ? req.amount + ' ' : '') + name,
          have: hasMixer(mixersState, req.mixer),
          category: null,
        };
      }
      const categoryLabel = CATEGORIES.find((c) => c.id === req.category)?.label || req.category;
      const name = req.note || categoryLabel;
      return {
        label: (req.amount ? req.amount + ' ' : '') + name,
        have: hasCategoryStock(bottlesState, req.category),
        category: req.category,
      };
    });
    const optionalStatus = recipe.optional.map((opt) => {
      const name = DEFAULT_MIXERS.find((m) => m.id === opt.item)?.name || titleCase(opt.item);
      return {
        label: (opt.amount ? opt.amount + ' ' : '') + name,
        have: hasMixer(mixersState, opt.item),
      };
    });
    const missing = requiredStatus.filter((r) => !r.have).length;
    return {
      name: recipe.name,
      source: 'house',
      ready: missing === 0,
      missing,
      required: requiredStatus,
      optional: optionalStatus,
      instructions: recipe.instructions || '',
    };
  }

  // Shared by discovered (CocktailDB) and custom (user-entered) recipes.
  // ingredients: array of { ingredient, measure } pairs.
  function computeIngredientListStatus(name, ingredients, bottlesState, mixersState, source, instructions) {
    const required = [];
    const optional = [];
    for (const { ingredient, measure } of ingredients) {
      const cls = classifyIngredient(ingredient);
      const label = (measure ? measure + ' ' : '') + ingredient;
      if (cls.type === 'bottle') {
        required.push({
          label,
          have: hasCategoryStock(bottlesState, cls.category),
          category: cls.category,
        });
      } else {
        optional.push({
          label,
          have: hasMixer(mixersState, cls.mixerId || ingredient),
        });
      }
    }
    const missing = required.filter((r) => !r.have).length;
    return {
      name,
      source,
      ready: required.length > 0 && missing === 0,
      missing,
      required,
      optional,
      instructions: instructions || '',
    };
  }

  // Compute status for a CocktailDB drink.
  function computeDiscoveredStatus(drinkName, ingredients, bottlesState, mixersState, instructions) {
    return computeIngredientListStatus(drinkName, ingredients, bottlesState, mixersState, 'discovered', instructions);
  }

  // Compute status for a user-entered recipe.
  // rawLines: array of free-text ingredient lines, e.g. "2 oz Bourbon".
  function computeCustomStatus(recipeName, rawLines, bottlesState, mixersState, instructions) {
    const ingredients = (rawLines || [])
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .map((line) => ({ ingredient: line, measure: '' }));
    return computeIngredientListStatus(recipeName, ingredients, bottlesState, mixersState, 'custom', instructions);
  }

  // Compute status for a favorited recipe, from its saved ingredient-line
  // snapshot (the rendered "amount + name" labels from whichever source it
  // was favorited from). Re-classifies those lines fresh each time so the
  // Ready/Missing status always reflects current inventory, while
  // originalSource keeps the House/Discovered/Yours tag it had originally.
  function computeFavoriteStatus(recipeName, ingredientLines, bottlesState, mixersState, instructions, originalSource) {
    const ingredients = (ingredientLines || [])
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .map((line) => ({ ingredient: line, measure: '' }));
    return computeIngredientListStatus(recipeName, ingredients, bottlesState, mixersState, originalSource || 'house', instructions);
  }

  function titleCase(s) {
    return String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  window.Rail = {
    CATEGORIES,
    LEVELS,
    WINE_CATEGORIES,
    DEFAULT_MIXERS,
    CURATED_RECIPES,
    COCKTAILDB_TERMS,
    classifyIngredient,
    hasMixer,
    hasCategoryStock,
    computeCuratedStatus,
    computeDiscoveredStatus,
    computeCustomStatus,
    computeFavoriteStatus,
    normalize,
  };
})();
