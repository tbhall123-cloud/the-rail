// ── The Rail — cocktail data + ingredient matching engine ─────────────
// Pure data/logic, no DOM or Firebase calls in here.
// Everything is exposed on window.Rail so app.js can use it.

(function () {

  const CATEGORIES = [
    { id: 'Whiskey',                  label: 'Whiskey',                  emoji: '🥃' },
    { id: 'Gin',                      label: 'Gin',                      emoji: '🌿' },
    { id: 'Vodka',                    label: 'Vodka',                    emoji: '❄️' },
    { id: 'Rum',                      label: 'Rum',                      emoji: '🏝️' },
    { id: 'Tequila/Mezcal',           label: 'Tequila / Mezcal',         emoji: '🌵' },
    { id: 'Brandy/Cognac',            label: 'Brandy / Cognac',          emoji: '🍂' },
    { id: 'Liqueur',                  label: 'Liqueur',                  emoji: '🍯' },
    { id: 'Vermouth/Fortified Wine',  label: 'Vermouth / Fortified Wine',emoji: '🍇' },
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
  // optional: mixer/garnish names (matched loosely against the mixers list)
  const CURATED_RECIPES = [
    { name: 'Old Fashioned',   required: ['Whiskey', 'Bitters'], optional: ['simple-syrup', 'orange peel', 'cherry'] },
    { name: 'Manhattan',       required: ['Whiskey', 'Vermouth/Fortified Wine', 'Bitters'], optional: ['cherry'] },
    { name: 'Whiskey Sour',    required: ['Whiskey'], optional: ['lemon', 'simple-syrup'] },
    { name: 'Boulevardier',    required: ['Whiskey', 'Liqueur', 'Vermouth/Fortified Wine'], optional: ['orange peel'] },
    { name: 'Martini',         required: ['Gin', 'Vermouth/Fortified Wine'], optional: ['olive', 'lemon'] },
    { name: 'Negroni',         required: ['Gin', 'Liqueur', 'Vermouth/Fortified Wine'], optional: ['orange peel'] },
    { name: 'Gin & Tonic',     required: ['Gin'], optional: ['tonic-water', 'lime'] },
    { name: 'Tom Collins',     required: ['Gin'], optional: ['lemon', 'simple-syrup', 'soda-water'] },
    { name: 'Daiquiri',        required: ['Rum'], optional: ['lime', 'simple-syrup'] },
    { name: 'Mojito',          required: ['Rum'], optional: ['lime', 'simple-syrup', 'soda-water', 'mint'] },
    { name: "Dark 'n' Stormy", required: ['Rum'], optional: ['ginger-beer', 'lime'] },
    { name: 'Margarita',       required: ['Tequila/Mezcal', 'Liqueur'], optional: ['lime'] },
    { name: 'Paloma',          required: ['Tequila/Mezcal'], optional: ['grapefruit-juice', 'lime', 'soda-water'] },
    { name: 'Vodka Martini',   required: ['Vodka', 'Vermouth/Fortified Wine'], optional: ['olive', 'lemon'] },
    { name: 'Moscow Mule',     required: ['Vodka'], optional: ['ginger-beer', 'lime'] },
    { name: 'White Russian',   required: ['Vodka', 'Liqueur'], optional: ['cream'] },
    { name: 'Sidecar',         required: ['Brandy/Cognac', 'Liqueur'], optional: ['lemon'] },
    { name: 'Espresso Martini',required: ['Vodka', 'Liqueur'], optional: ['espresso', 'simple-syrup'] },
    { name: 'Aperol Spritz',   required: ['Liqueur', 'Champagne/Sparkling'], optional: ['soda-water', 'orange'] },
    { name: 'Mimosa',          required: ['Champagne/Sparkling'], optional: ['orange-juice'] },
    { name: 'Kir Royale',      required: ['Champagne/Sparkling', 'Liqueur'], optional: [] },
    { name: 'Bellini',         required: ['Champagne/Sparkling'], optional: ['peach puree'] },
    { name: 'Sangria',         required: ['Wine'], optional: ['orange-juice', 'orange', 'lemon'] },
    { name: 'Wine Spritzer',   required: ['Wine'], optional: ['soda-water'] },
    { name: 'Tequila Sunrise', required: ['Tequila/Mezcal'], optional: ['orange-juice', 'grenadine'] },
    { name: 'Jack Rose',       required: ['Brandy/Cognac'], optional: ['lime', 'grenadine'] },
    { name: 'Bacardi Cocktail',required: ['Rum'], optional: ['lime', 'grenadine'] },
    { name: 'Ward Eight',      required: ['Whiskey'], optional: ['lemon', 'orange-juice', 'grenadine'] },
  ];

  // ── CocktailDB representative search terms per category ───────────
  // Used to find *candidate* drinks worth checking; the real matching
  // happens afterwards against the full ingredient list.
  const COCKTAILDB_TERMS = {
    'Whiskey':                 ['Bourbon', 'Whiskey', 'Scotch', 'Rye Whiskey'],
    'Gin':                     ['Gin'],
    'Vodka':                   ['Vodka'],
    'Rum':                     ['Rum', 'Light rum', 'Dark rum'],
    'Tequila/Mezcal':          ['Tequila', 'Mezcal'],
    'Brandy/Cognac':           ['Brandy', 'Cognac'],
    'Liqueur':                 ['Triple sec', 'Campari', 'Coffee liqueur', 'Amaretto'],
    'Vermouth/Fortified Wine': ['Dry Vermouth', 'Sweet Vermouth', 'Sherry'],
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
    ['Vermouth/Fortified Wine', ['vermouth', 'sherry', 'port', 'madeira', 'lillet', 'dubonnet', 'fortified wine']],
    ['Beer/Cider', ['beer', 'lager', 'ale', 'stout', 'cider']],
    ['Wine', ['red wine', 'white wine', 'rose wine', 'rosé wine', 'wine']],
    ['Whiskey', ['whisky', 'whiskey', 'bourbon', 'scotch', 'rye', 'irish whiskey', 'tennessee whiskey', 'canadian whisky']],
    ['Gin', ['gin']],
    ['Vodka', ['vodka']],
    ['Rum', ['rum', 'cachaca', 'cachaça']],
    ['Tequila/Mezcal', ['tequila', 'mezcal']],
    ['Brandy/Cognac', ['brandy', 'cognac', 'armagnac', 'calvados', 'applejack', 'pisco']],
    ['Liqueur', [
      'triple sec', 'cointreau', 'grand marnier', 'curacao', 'curaçao',
      'coffee liqueur', 'kahlua', 'kahlúa', 'tia maria', 'amaretto', 'disaronno',
      'chambord', 'creme de cassis', 'crème de cassis', 'creme de menthe', 'crème de menthe',
      'creme de violette', 'crème de violette', 'creme de cacao', 'crème de cacao',
      'benedictine', 'drambuie', 'chartreuse', 'campari', 'aperol', 'st germain',
      'st-germain', 'elderflower liqueur', 'midori', 'sambuca', 'frangelico', 'galliano',
      'baileys', 'irish cream', 'southern comfort', 'jagermeister', 'jägermeister',
      'maraschino liqueur', 'luxardo', 'peach schnapps', 'schnapps', 'liqueur', 'amaro',
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
    'bacardi': 'Rum', 'captain morgan': 'Rum', 'malibu': 'Rum', 'mount gay': 'Rum',
    'jose cuervo': 'Tequila/Mezcal', 'patron': 'Tequila/Mezcal', 'patrón': 'Tequila/Mezcal',
    'don julio': 'Tequila/Mezcal', 'espolon': 'Tequila/Mezcal',
    'hennessy': 'Brandy/Cognac', 'remy martin': 'Brandy/Cognac', 'rémy martin': 'Brandy/Cognac',
    'courvoisier': 'Brandy/Cognac',
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
  function hasCategoryStock(bottlesState, category) {
    return Object.values(bottlesState || {}).some(
      (b) => b && b.category === category && b.level !== 'empty' && !b.restricted
    );
  }

  // Compute status for a curated recipe against current inventory state.
  function computeCuratedStatus(recipe, bottlesState, mixersState) {
    const requiredStatus = recipe.required.map((category) => ({
      label: CATEGORIES.find((c) => c.id === category)?.label || category,
      have: hasCategoryStock(bottlesState, category),
      category,
    }));
    const optionalStatus = recipe.optional.map((item) => {
      const label = DEFAULT_MIXERS.find((m) => m.id === item)?.name || titleCase(item);
      return { label, have: hasMixer(mixersState, item) };
    });
    const missing = requiredStatus.filter((r) => !r.have).length;
    return {
      name: recipe.name,
      source: 'house',
      ready: missing === 0,
      missing,
      required: requiredStatus,
      optional: optionalStatus,
    };
  }

  // Shared by discovered (CocktailDB) and custom (user-entered) recipes.
  // ingredients: array of { ingredient, measure } pairs.
  function computeIngredientListStatus(name, ingredients, bottlesState, mixersState, source) {
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
    };
  }

  // Compute status for a CocktailDB drink.
  function computeDiscoveredStatus(drinkName, ingredients, bottlesState, mixersState) {
    return computeIngredientListStatus(drinkName, ingredients, bottlesState, mixersState, 'discovered');
  }

  // Compute status for a user-entered recipe.
  // rawLines: array of free-text ingredient lines, e.g. "2 oz Bourbon".
  function computeCustomStatus(recipeName, rawLines, bottlesState, mixersState) {
    const ingredients = (rawLines || [])
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .map((line) => ({ ingredient: line, measure: '' }));
    return computeIngredientListStatus(recipeName, ingredients, bottlesState, mixersState, 'custom');
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
    normalize,
  };
})();
