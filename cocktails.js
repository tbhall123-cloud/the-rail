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
    { id: 'espresso',          name: 'Espresso' },
    { id: 'grenadine',         name: 'Grenadine' },
    { id: 'lime-juice',        name: 'Lime Juice' },
    { id: 'mint',              name: 'Mint' },
    { id: 'red-bull',          name: 'Red Bull' },
    { id: 'cocktail-cherries', name: 'Cocktail Cherries' },
    // ids matching the exact strings CURATED_RECIPES already reference
    // via { mixer: '...' } / { item: '...' } — the lookup in
    // computeCuratedStatus keys off id === that literal string.
    { id: 'peach puree',       name: 'Peach Puree' },
    { id: 'olive',             name: 'Olive' },
    { id: 'orange peel',       name: 'Orange Peel' },
    { id: 'pineapple-juice',   name: 'Pineapple Juice' },
    { id: 'cranberry-juice',   name: 'Cranberry Juice' },
    { id: 'egg-white',         name: 'Egg White' },
  ];

  // ── Curated "house" recipes ────────────────────────────────────────
  // required: category ids that must have a non-empty bottle
  // required: { category, amount, note? } — a bottle checked against
  //            stock, OR { mixer, amount } — an essential mixer checked
  //            against the mixers list. Either way it counts toward
  //            Ready/Missing, since the drink doesn't work without it.
  //            note overrides the generic category label for display
  //            when a specific ingredient is customary (e.g. Prosecco
  //            for a Champagne/Sparkling slot). For most categories
  //            matching still checks the whole category, but in the
  //            catch-all categories listed in SPECIFIC_INGREDIENTS
  //            (Liqueur (Other), Bitters, Fortified Wine) a note naming
  //            a specific ingredient also drives matching — e.g. Kir
  //            Royale's "Crème de Cassis" needs a bottle whose name
  //            says cassis, not just any liqueur.
  // optional: { item, amount } — a true garnish. Never blocks Ready.
  const CURATED_RECIPES = [
    { name: 'Old Fashioned',
      required: [{ category: 'Whiskey', amount: '2 oz', note: 'Bourbon or Rye' }, { category: 'Bitters', amount: '2-3 dashes', note: 'Angostura Bitters' }, { mixer: 'simple-syrup', amount: '1/4 oz' }],
      optional: [{ item: 'orange peel', amount: '1 twist' }, { item: 'cherry', amount: '1' }],
      instructions: 'In a rocks glass, stir 1/4 oz simple syrup with 2-3 dashes bitters and a splash of water until combined. Add 2 oz whiskey and a large ice cube, stir 20–30 seconds to chill. Express an orange twist over the top and drop it in.' },
    { name: 'Manhattan',
      required: [{ category: 'Whiskey', amount: '2 oz', note: 'Rye or Bourbon' }, { category: 'Sweet Vermouth', amount: '1 oz' }, { category: 'Bitters', amount: '2 dashes', note: 'Angostura Bitters' }],
      optional: [{ item: 'cherry', amount: '1' }],
      instructions: 'Stir 2 oz whiskey, 1 oz sweet vermouth, and 2 dashes bitters with ice in a mixing glass for 20–30 seconds. Strain into a chilled coupe. Garnish with a cherry.' },
    { name: 'Whiskey Sour',
      required: [{ category: 'Whiskey', amount: '2 oz', note: 'Bourbon' }, { mixer: 'lemon', amount: '3/4 oz' }, { mixer: 'simple-syrup', amount: '3/4 oz' }],
      optional: [],
      instructions: 'Shake 2 oz whiskey, 3/4 oz lemon juice, and 3/4 oz simple syrup hard with ice for 10–15 seconds. Strain over fresh ice in a rocks glass.' },
    { name: 'Boulevardier',
      required: [{ category: 'Whiskey', amount: '1 oz', note: 'Bourbon or Rye' }, { category: 'Campari', amount: '1 oz' }, { category: 'Sweet Vermouth', amount: '1 oz' }],
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
      required: [{ category: 'Tequila', amount: '2 oz' }, { category: 'Orange Liqueur', amount: '1 oz', note: 'Triple Sec' }, { mixer: 'lime', amount: '1 oz' }],
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
      required: [{ category: 'Cognac', amount: '2 oz' }, { category: 'Orange Liqueur', amount: '1 oz', note: 'Triple Sec' }, { mixer: 'lemon', amount: '3/4 oz' }],
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
      required: [{ category: 'Wine', amount: '4 oz per glass', note: 'Red Wine' }, { mixer: 'orange-juice', amount: '1 oz per glass' }],
      optional: [{ item: 'orange', amount: 'slices' }, { item: 'lemon', amount: 'slices' }],
      instructions: 'In a pitcher, combine red wine, orange juice, and sliced fruit (roughly 4 oz wine to 1 oz orange juice per serving). Refrigerate at least 2 hours (overnight is better) so the fruit macerates. Serve over ice.' },
    { name: 'Wine Spritzer',
      required: [{ category: 'Wine', amount: '3 oz', note: 'White Wine' }, { mixer: 'soda-water', amount: 'top' }],
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
      required: [{ category: 'Whiskey', amount: '2 oz', note: 'Rye Whiskey' }, { mixer: 'lemon', amount: '3/4 oz' }, { mixer: 'orange-juice', amount: '3/4 oz' }, { mixer: 'grenadine', amount: '1/2 oz' }],
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

  // ── Specific ingredients inside catch-all categories ───────────────
  // Liqueur (Other), Bitters and Fortified Wine each hold very different
  // bottles, so matching by category alone lets an Amaretto satisfy a
  // recipe that needs Crème de Cassis. When a recipe names one of these
  // groups, only a bottle whose NAME mentions one of the group's terms
  // counts. Anything not listed here (plain "liqueur", "bitters",
  // "Angostura bitters", "aromatic bitters") stays generic, so any bottle
  // in the category works. Angostura is deliberately absent: it's the
  // default bitters and any aromatic bitters does the job.
  // Terms are written accent-free; they're compared via foldText().
  const SPECIFIC_INGREDIENTS = {
    'Liqueur (Other)': [
      ['liqueur:amaretto',   ['amaretto', 'disaronno', 'lazzaroni']],
      ['liqueur:cassis',     ['cassis']],
      ['liqueur:raspberry',  ['chambord', 'raspberry liqueur', 'framboise']],
      ['liqueur:menthe',     ['creme de menthe']],
      ['liqueur:violette',   ['creme de violette', 'violette']],
      ['liqueur:cacao',      ['creme de cacao']],
      ['liqueur:benedictine', ['benedictine']],
      ['liqueur:drambuie',   ['drambuie']],
      ['liqueur:chartreuse', ['chartreuse']],
      ['liqueur:elderflower', ['elderflower', 'st germain', 'saint germain']],
      ['liqueur:melon',      ['melon liqueur', 'midori']],
      ['liqueur:anise',      ['sambuca', 'pastis', 'pernod', 'absinthe', 'ouzo', 'anisette']],
      ['liqueur:hazelnut',   ['hazelnut', 'frangelico']],
      ['liqueur:galliano',   ['galliano']],
      ['liqueur:irish-cream', ['irish cream', 'baileys']],
      ['liqueur:southern-comfort', ['southern comfort']],
      ['liqueur:jagermeister', ['jagermeister']],
      ['liqueur:maraschino', ['maraschino', 'luxardo']],
      ['liqueur:peach-schnapps', ['peach schnapps']],
      ['liqueur:fernet',     ['fernet']],
      ['liqueur:amaro',      ['amaro', 'montenegro', 'nonino', 'averna', 'cynar', 'ramazzotti']],
      ['liqueur:limoncello', ['limoncello']],
    ],
    'Bitters': [
      ['bitters:peychaud',   ['peychaud']],
      ['bitters:orange',     ['orange']],
      ['bitters:chocolate',  ['chocolate', 'mole', 'cacao']],
      ['bitters:celery',     ['celery']],
      ['bitters:grapefruit', ['grapefruit']],
      ['bitters:cherry',     ['cherry']],
      ['bitters:walnut',     ['walnut']],
    ],
    'Fortified Wine': [
      ['fortified:sherry',   ['sherry', 'fino', 'manzanilla', 'amontillado', 'oloroso', 'pedro ximenez']],
      ['fortified:port',     ['port', 'porto', 'tawny', 'ruby']],
      ['fortified:madeira',  ['madeira']],
      ['fortified:marsala',  ['marsala']],
      ['fortified:lillet',   ['lillet', 'cocchi americano']],
      ['fortified:dubonnet', ['dubonnet']],
    ],
  };

  const SPECIFIC_TERMS = {};
  Object.values(SPECIFIC_INGREDIENTS).forEach((groups) =>
    groups.forEach(([key, terms]) => { SPECIFIC_TERMS[key] = terms; })
  );

  // Exact TheCocktailDB ingredient names to search for each specific
  // group, so discovery looks up drinks for the liqueurs/bitters/fortified
  // wines a bar actually owns. Every name was confirmed against the API
  // (search.php returns the canonical spelling; filter.php confirmed at
  // least one drink uses it). The free key's list.php stops at 100 names
  // (A–"Kiwi"), so it can't be the source of truth on its own.
  // Groups with no ingredient that any drink uses are left out on
  // purpose — owning one of those falls back to the category's default
  // COCKTAILDB_TERMS (see discoveryTerms): violette, fernet, limoncello,
  // chocolate/celery/grapefruit/cherry/walnut bitters, madeira, marsala.
  const COCKTAILDB_INGREDIENT_NAMES = {
    'liqueur:amaretto':         ['Amaretto'],
    'liqueur:cassis':           ['Creme De Cassis'],
    'liqueur:raspberry':        ['Chambord Raspberry Liqueur', 'Raspberry Liqueur'],
    'liqueur:menthe':           ['Green Creme de Menthe', 'White Creme de Menthe'],
    'liqueur:cacao':            ['Creme De Cacao', 'Dark Creme De Cacao'],
    'liqueur:benedictine':      ['Benedictine'],
    'liqueur:drambuie':         ['Drambuie'],
    'liqueur:chartreuse':       ['Green Chartreuse', 'Yellow Chartreuse'],
    'liqueur:elderflower':      ['St. Germain'],
    'liqueur:melon':            ['Midori Melon Liqueur', 'Melon Liqueur'],
    'liqueur:anise':            ['Absinthe', 'Sambuca', 'Black Sambuca', 'Pernod', 'Ouzo', 'Anis', 'Anisette', 'Ricard'],
    'liqueur:hazelnut':         ['Frangelico'],
    'liqueur:galliano':         ['Galliano'],
    'liqueur:irish-cream':      ['Baileys Irish Cream', 'Irish cream'],
    'liqueur:southern-comfort': ['Southern Comfort'],
    'liqueur:jagermeister':     ['Jagermeister'],
    'liqueur:maraschino':       ['Maraschino Liqueur'],
    'liqueur:peach-schnapps':   ['Peach Schnapps'],
    'liqueur:amaro':            ['Amaro Montenegro'],
    'bitters:peychaud':         ['Peychaud bitters'],
    'bitters:orange':           ['Orange Bitters'],
    'fortified:sherry':         ['Sherry'],
    'fortified:port':           ['Port', 'Ruby Port'],
    'fortified:lillet':         ['Lillet Blanc', 'Lillet'],
    'fortified:dubonnet':       ['Dubonnet Rouge'],
  };

  // In stock = same rules as hasCategoryStock(): not empty, not restricted.
  function inStockBottles(bottlesState, category) {
    return Object.values(bottlesState || {}).filter(
      (b) => b && b.category === category && b.level !== 'empty' && !b.restricted
    );
  }

  // Specific-ingredient keys (e.g. 'liqueur:chartreuse') for the in-stock
  // bottles in the catch-all categories, read from each bottle's name.
  function ownedSpecificKeys(bottlesState) {
    const keys = new Set();
    Object.keys(SPECIFIC_INGREDIENTS).forEach((category) => {
      inStockBottles(bottlesState, category).forEach((b) => {
        const key = specificKeyFor(category, b.name);
        if (key) keys.add(key);
      });
    });
    return keys;
  }

  // Catch-all categories holding at least one in-stock bottle that gives
  // discovery nothing specific to search (no group match, e.g. a bottle
  // just named "Liqueur", or a group with no CocktailDB names) — those
  // keep searching the category's default terms so nothing works worse
  // than before.
  function fallbackCategories(bottlesState) {
    return Object.keys(SPECIFIC_INGREDIENTS).filter((category) =>
      inStockBottles(bottlesState, category).some((b) => {
        const key = specificKeyFor(category, b.name);
        return !key || !COCKTAILDB_INGREDIENT_NAMES[key];
      })
    );
  }

  // TheCocktailDB filter terms for everything in stock. Base spirits use
  // their fixed COCKTAILDB_TERMS exactly as before; catch-all categories
  // search the specific ingredients actually owned, plus the default
  // terms when fallbackCategories() says so.
  function discoveryTerms(bottlesState) {
    const terms = new Set();
    const fallback = new Set(fallbackCategories(bottlesState));
    CATEGORIES.forEach(({ id }) => {
      if (!hasCategoryStock(bottlesState, id)) return;
      if (!SPECIFIC_INGREDIENTS[id] || fallback.has(id)) {
        (COCKTAILDB_TERMS[id] || []).forEach((t) => terms.add(t));
      }
    });
    ownedSpecificKeys(bottlesState).forEach((key) => {
      (COCKTAILDB_INGREDIENT_NAMES[key] || []).forEach((t) => terms.add(t));
    });
    return terms;
  }

  // Changes whenever discoveryTerms() could change: stocked categories,
  // owned specific ingredients, and which catch-alls need their fallback.
  function discoveryRefreshKey(bottlesState) {
    const stocked = CATEGORIES.map((c) => c.id).filter((id) => hasCategoryStock(bottlesState, id)).sort();
    const keys = [...ownedSpecificKeys(bottlesState)].sort();
    const fallback = fallbackCategories(bottlesState).sort();
    return stocked.join(',') + '|' + keys.join(',') + '|' + fallback.join(',');
  }

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

  // Like normalize(), but folds accents first ("Crème" → "creme") instead
  // of turning them into spaces. Kept separate on purpose: normalize()'s
  // output is stored as Firebase keys (catalog keys, mixer ids,
  // favorites), so changing it would orphan existing data.
  function foldText(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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

  // Whole-word match on folded text, allowing a trailing "s" so plurals
  // and possessives ("Peychaud's" → "peychauds") still count.
  function termMatch(foldedHaystack, term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + 's?\\b').test(foldedHaystack);
  }

  // The specific-ingredient group a recipe's text names within a
  // catch-all category, or null when it's generic (any bottle counts).
  function specificKeyFor(category, text) {
    const groups = SPECIFIC_INGREDIENTS[category];
    if (!groups || !text) return null;
    const folded = foldText(text);
    for (const [key, terms] of groups) {
      if (terms.some((t) => termMatch(folded, t))) return key;
    }
    return null;
  }

  // Name only, never the description: descriptions often mention other
  // drinks ("great in a Kir Royale") and would cause false matches.
  function bottleMatchesSpecific(bottle, specificKey) {
    if (!specificKey) return true;
    const terms = SPECIFIC_TERMS[specificKey];
    if (!terms || !bottle) return false;
    const folded = foldText(bottle.name);
    return terms.some((t) => termMatch(folded, t));
  }

  // Signals that a mixer-classified ingredient is a decorative garnish
  // rather than something actually mixed into the drink — checked
  // against both the ingredient name and its measure (CocktailDB often
  // puts the tell in the measure, e.g. "1 Wedge" or "For rim").
  const GARNISH_SIGNALS = [
    'wedge', 'twist', 'peel', 'zest', 'wheel', 'slice', 'sprig', 'garnish',
    'rim', 'umbrella', 'stick', 'cherry', 'olive', 'cocktail onion', 'straw',
  ];

  function isGarnish(ingredientText, measureText) {
    const combined = normalize(String(ingredientText || '') + ' ' + String(measureText || ''));
    return GARNISH_SIGNALS.some((kw) => combined.includes(kw));
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

  // specificKey (optional, from specificKeyFor) narrows a catch-all
  // category to bottles whose name names that ingredient.
  function hasCategoryStock(bottlesState, category, specificKey) {
    const matchCategories = CATEGORY_GROUPS[category] || [category];
    return Object.values(bottlesState || {}).some(
      (b) => b && matchCategories.includes(b.category) && b.level !== 'empty' && !b.restricted &&
        bottleMatchesSpecific(b, specificKey)
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
          plainLabel: name,
          have: hasMixer(mixersState, req.mixer),
          category: null,
        };
      }
      const categoryLabel = CATEGORIES.find((c) => c.id === req.category)?.label || req.category;
      const name = req.note || categoryLabel;
      const specific = specificKeyFor(req.category, req.note);
      return {
        label: (req.amount ? req.amount + ' ' : '') + name,
        plainLabel: name,
        have: hasCategoryStock(bottlesState, req.category, specific),
        category: req.category,
        specific,
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
  // Bottle ingredients are always required. Mixer ingredients are
  // required too UNLESS they carry a garnish signal (wedge, twist,
  // cherry, rim, etc.), in which case they're a true garnish and stay
  // optional — same "required mixer vs. garnish" rule as the house
  // recipes, applied generically here since discovered/custom recipes
  // don't have that distinction hand-authored.
  function computeIngredientListStatus(name, ingredients, bottlesState, mixersState, source, instructions) {
    const required = [];
    const optional = [];
    for (const { ingredient, measure } of ingredients) {
      const cls = classifyIngredient(ingredient);
      const label = (measure ? measure + ' ' : '') + ingredient;
      if (cls.type === 'bottle') {
        const specific = specificKeyFor(cls.category, ingredient);
        required.push({
          label,
          plainLabel: ingredient,
          have: hasCategoryStock(bottlesState, cls.category, specific),
          category: cls.category,
          specific,
        });
      } else if (isGarnish(ingredient, measure)) {
        optional.push({
          label,
          have: hasMixer(mixersState, cls.mixerId || ingredient),
        });
      } else {
        required.push({
          label,
          plainLabel: ingredient,
          have: hasMixer(mixersState, cls.mixerId || ingredient),
          category: null,
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
    CATEGORY_GROUPS,
    classifyIngredient,
    hasMixer,
    isGarnish,
    hasCategoryStock,
    computeCuratedStatus,
    computeDiscoveredStatus,
    computeCustomStatus,
    computeFavoriteStatus,
    normalize,
    SPECIFIC_INGREDIENTS,
    foldText,
    specificKeyFor,
    bottleMatchesSpecific,
    COCKTAILDB_INGREDIENT_NAMES,
    ownedSpecificKeys,
    discoveryTerms,
    discoveryRefreshKey,
  };
})();
