#!/usr/bin/env node

/**
 * Script de téléchargement des cartes Pokémon TCG en local
 * 
 * Usage:
 *   node download-tcg-cards.js --download --range 1-151
 *   node download-tcg-cards.js --download --all
 *   node download-tcg-cards.js --clean
 *   node download-tcg-cards.js --verify
 *   node download-tcg-cards.js --stats
 * 
 * Options:
 *   --download         Télécharge les cartes
 *   --range N-M        Pokédex #N à #M (ex: 1-151 pour gen 1)
 *   --all              Tous les Pokémon (1-1025)
 *   --limit N          Nombre max de cartes par Pokémon (défaut: 10)
 *   --clean            Supprime toutes les cartes téléchargées
 *   --verify           Vérifie l'intégrité des fichiers
 *   --stats            Affiche les statistiques
 *   --force            Force le re-téléchargement même si déjà présent
 *   --delay N          Délai entre requêtes en ms (défaut: 500)
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  API_BASE_URL: 'https://api.pokemontcg.io/v2',
  OUTPUT_DIR: path.join(__dirname, 'public', 'tcg-cards'),
  METADATA_FILE: path.join(__dirname, 'public', 'tcg-cards', 'metadata.json'),
  GITHUB_REPO_DIR: path.join(__dirname, 'pokemon-tcg-data'),
  GITHUB_REPO_URL: 'https://github.com/PokemonTCG/pokemon-tcg-data.git',
  GITHUB_CARDS_DIR: path.join(__dirname, 'pokemon-tcg-data', 'cards', 'en'),
  MAX_CARDS_PER_POKEMON: 10,
  REQUEST_DELAY: 500,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
};

// ═══════════════════════════════════════════════════════════════
// COULEURS POUR LE TERMINAL
// ═══════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES HTTP
// ═══════════════════════════════════════════════════════════════

/**
 * Requête HTTPS avec gestion d'erreur
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Télécharge une image
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }

      const fileStream = require('fs').createWriteStream(filepath);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Délai asynchrone
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry avec backoff exponentiel
 */
async function retryWithBackoff(fn, maxAttempts = CONFIG.RETRY_ATTEMPTS) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delayMs = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
      log.warning(`Tentative ${attempt}/${maxAttempts} échouée, retry dans ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GESTION DES MÉTADONNÉES
// ═══════════════════════════════════════════════════════════════

/**
 * Charge les métadonnées existantes
 */
async function loadMetadata() {
  try {
    const data = await fs.readFile(CONFIG.METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { pokemon: {}, lastUpdate: null, version: '1.0' };
  }
}

/**
 * Sauvegarde les métadonnées
 */
async function saveMetadata(metadata) {
  metadata.lastUpdate = new Date().toISOString();
  await fs.writeFile(CONFIG.METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// ANALYSE DU CACHE EXISTANT
// ═══════════════════════════════════════════════════════════════

/**
 * Analyse l'état du cache et identifie les Pokémon manquants/incomplets
 */
async function analyzeCache(start, end) {
  log.title('🔍 Analyse du cache existant');
  
  const analysis = {
    complete: [],      // Pokémon avec cartes et métadonnées
    incomplete: [],    // Pokémon avec cartes mais sans métadonnées
    empty: [],         // Pokémon avec dossier .empty (API failed)
    missing: [],       // Pokémon sans aucun fichier
    total: 0
  };
  
  for (let i = start; i <= end; i++) {
    const status = await checkPokemonDownloaded(i);
    
    if (status.exists && status.hasMetadata) {
      analysis.complete.push({ num: i, count: status.count });
    } else if (status.exists && !status.hasMetadata) {
      analysis.incomplete.push(i);
    } else {
      // Vérifier si c'est marqué comme .empty
      const emptyFile = path.join(status.dir, '.empty');
      try {
        await fs.access(emptyFile);
        analysis.empty.push(i);
      } catch {
        analysis.missing.push(i);
      }
    }
    
    analysis.total++;
  }
  
  // Afficher le résumé
  console.log(`\n${colors.green}✓ Complets (${analysis.complete.length})${colors.reset}`);
  if (analysis.complete.length > 0 && analysis.complete.length <= 20) {
    console.log(`  #${analysis.complete.map(p => p.num).join(', #')}`);
  }
  
  console.log(`\n${colors.yellow}⚠ Incomplets (${analysis.incomplete.length})${colors.reset}`);
  if (analysis.incomplete.length > 0) {
    console.log(`  #${analysis.incomplete.join(', #')}`);
  }
  
  console.log(`\n${colors.red}✗ Échecs API précédents (${analysis.empty.length})${colors.reset}`);
  if (analysis.empty.length > 0) {
    console.log(`  #${analysis.empty.join(', #')}`);
  }
  
  console.log(`\n${colors.blue}◯ Manquants (${analysis.missing.length})${colors.reset}`);
  if (analysis.missing.length > 0 && analysis.missing.length <= 50) {
    console.log(`  #${analysis.missing.join(', #')}`);
  } else if (analysis.missing.length > 50) {
    console.log(`  #${analysis.missing.slice(0, 20).join(', #')} ... et ${analysis.missing.length - 20} autres`);
  }
  
  const toDownload = [...analysis.incomplete, ...analysis.empty, ...analysis.missing];
  console.log(`\n${colors.cyan}📥 À télécharger : ${toDownload.length}/${analysis.total}${colors.reset}\n`);
  
  return analysis;
}

/**
 * Télécharge uniquement les Pokémon manquants ou incomplets
 */
async function downloadMissing(start, end, options = {}) {
  const analysis = await analyzeCache(start, end);
  
  const toDownload = [
    ...analysis.incomplete,
    ...analysis.missing,
    ...(options.retryFailed ? analysis.empty : [])
  ].sort((a, b) => a - b);
  
  if (toDownload.length === 0) {
    log.success('Tous les Pokémon sont déjà téléchargés ! 🎉');
    return;
  }
  
  let cardsByPokedex = null;
  
  if (options.useGithub) {
    const hasRepo = await checkGithubRepo();
    
    if (!hasRepo) {
      await cloneGithubRepo();
    } else {
      log.info('Repo GitHub déjà cloné');
    }
    
    cardsByPokedex = await parseGithubCards();
    options.cardsByPokedex = cardsByPokedex;
  }
  
  log.title(`📥 Téléchargement des ${toDownload.length} Pokémon manquants`);
  
  const stats = {
    total: toDownload.length,
    success: 0,
    failed: 0,
    cardsDownloaded: 0,
  };
  
  const concurrent = options.concurrent || 1;
  
  if (concurrent > 1) {
    log.info(`Mode concurrent: ${concurrent} téléchargements simultanés`);
    
    const chunks = [];
    for (let i = 0; i < toDownload.length; i += concurrent) {
      chunks.push(toDownload.slice(i, i + concurrent));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (pokedexNumber) => {
        try {
          const result = await downloadPokemonCards(pokedexNumber, options);
          
          if (!result.skipped) {
            stats.success++;
            stats.cardsDownloaded += result.count;
          }
        } catch (error) {
          stats.failed++;
          log.error(`Échec pour Pokémon #${pokedexNumber}: ${error.message}`);
        }
      });
      
      await Promise.all(promises);
      
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await delay(options.delay || CONFIG.REQUEST_DELAY);
      }
    }
  } else {
    for (const pokedexNumber of toDownload) {
      try {
        const result = await downloadPokemonCards(pokedexNumber, options);
        
        if (!result.skipped) {
          stats.success++;
          stats.cardsDownloaded += result.count;
        }
      } catch (error) {
        stats.failed++;
        log.error(`Échec pour Pokémon #${pokedexNumber}: ${error.message}`);
      }
      
      await delay(options.delay || CONFIG.REQUEST_DELAY);
    }
  }
  
  log.title('📊 Résumé du téléchargement');
  console.log(`Pokémon à traiter     : ${stats.total}`);
  console.log(`${colors.green}Succès                : ${stats.success}${colors.reset}`);
  console.log(`${colors.red}Échecs                : ${stats.failed}${colors.reset}`);
  console.log(`${colors.cyan}Cartes téléchargées   : ${stats.cardsDownloaded}${colors.reset}`);
  
  const metadata = await loadMetadata();
  await saveMetadata(metadata);
}

// ═══════════════════════════════════════════════════════════════
// NETTOYAGE INTELLIGENT
// ═══════════════════════════════════════════════════════════════

/**
 * Nettoie les dossiers vides ou les fichiers .empty
 */
async function cleanEmpty() {
  log.title('🧹 Nettoyage des dossiers vides et marqueurs d\'échec');
  
  let cleaned = 0;
  
  try {
    const dirs = await fs.readdir(CONFIG.OUTPUT_DIR);
    
    for (const dir of dirs) {
      if (!/^\d{4}$/.test(dir)) continue;
      
      const pokemonDir = path.join(CONFIG.OUTPUT_DIR, dir);
      const files = await fs.readdir(pokemonDir);
      
      // Si seulement .empty, supprimer le dossier
      if (files.length === 1 && files[0] === '.empty') {
        await fs.rm(pokemonDir, { recursive: true, force: true });
        cleaned++;
        log.info(`Supprimé : #${dir} (marqué .empty)`);
      }
      // Si dossier complètement vide
      else if (files.length === 0) {
        await fs.rm(pokemonDir, { recursive: true, force: true });
        cleaned++;
        log.info(`Supprimé : #${dir} (vide)`);
      }
    }
    
    log.success(`\n${cleaned} dossier(s) nettoyé(s)`);
    
  } catch (error) {
    log.error(`Erreur lors du nettoyage: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// GESTION DU REPO GITHUB
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie si le repo GitHub est cloné
 */
async function checkGithubRepo() {
  try {
    await fs.access(CONFIG.GITHUB_REPO_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clone le repo GitHub
 */
async function cloneGithubRepo() {
  const { execSync } = require('child_process');
  
  log.title('📥 Clonage du repo GitHub pokemon-tcg-data');
  
  try {
    execSync(`git clone --depth 1 ${CONFIG.GITHUB_REPO_URL} ${CONFIG.GITHUB_REPO_DIR}`, {
      stdio: 'inherit'
    });
    log.success('Repo cloné avec succès');
  } catch (error) {
    throw new Error(`Échec du clonage: ${error.message}`);
  }
}

/**
 * Parse tous les fichiers JSON et extrait les cartes par Pokédex
 */
async function parseGithubCards() {
  log.title('🔍 Parsing des fichiers JSON');
  
  const cardsByPokedex = new Map();
  
  try {
    const files = await fs.readdir(CONFIG.GITHUB_CARDS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    log.info(`${jsonFiles.length} fichiers JSON trouvés`);
    
    for (const file of jsonFiles) {
      const filePath = path.join(CONFIG.GITHUB_CARDS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const cards = JSON.parse(content);
      
      for (const card of cards) {
        if (!card.nationalPokedexNumbers || card.nationalPokedexNumbers.length === 0) {
          continue;
        }
        
        if (card.supertype !== 'Pokémon') {
          continue;
        }
        
        for (const pokedexNum of card.nationalPokedexNumbers) {
          if (!cardsByPokedex.has(pokedexNum)) {
            cardsByPokedex.set(pokedexNum, []);
          }
          
          cardsByPokedex.get(pokedexNum).push({
            id: card.id,
            name: card.name,
            set: card.set?.name || 'Unknown',
            rarity: card.rarity,
            imageSmall: card.images?.small,
            imageLarge: card.images?.large,
          });
        }
      }
    }
    
    log.success(`${cardsByPokedex.size} Pokémon trouvés avec des cartes`);
    
    return cardsByPokedex;
    
  } catch (error) {
    throw new Error(`Erreur parsing JSON: ${error.message}`);
  }
}

/**
 * Diversifie les cartes (1 par set)
 */
function diversifyCards(cards, limit) {
  const seenSets = new Set();
  const unique = [];
  
  for (const card of cards) {
    const setKey = card.set;
    if (!seenSets.has(setKey)) {
      seenSets.add(setKey);
      unique.push(card);
      if (unique.length >= limit) break;
    }
  }
  
  if (unique.length < limit) {
    for (const card of cards) {
      if (!unique.some(c => c.id === card.id)) {
        unique.push(card);
        if (unique.length >= limit) break;
      }
    }
  }
  
  return unique;
}

// ═══════════════════════════════════════════════════════════════
// TÉLÉCHARGEMENT DES CARTES
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie si un Pokémon a déjà des cartes téléchargées
 */
async function checkPokemonDownloaded(pokedexNumber) {
  const pokemonDir = path.join(CONFIG.OUTPUT_DIR, String(pokedexNumber).padStart(4, '0'));
  
  try {
    const files = await fs.readdir(pokemonDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    const hasMetadata = files.includes('metadata.json');
    
    return {
      exists: pngFiles.length > 0,
      count: pngFiles.length,
      hasMetadata,
      dir: pokemonDir
    };
  } catch {
    return {
      exists: false,
      count: 0,
      hasMetadata: false,
      dir: pokemonDir
    };
  }
}

/**
 * Récupère les cartes d'un Pokémon via l'API TCG
 */
async function fetchPokemonCards(pokedexNumber, limit = CONFIG.MAX_CARDS_PER_POKEMON) {
  const query = encodeURIComponent(`nationalPokedexNumbers:${pokedexNumber} supertype:"Pokémon"`);
  const url = `${CONFIG.API_BASE_URL}/cards?q=${query}&pageSize=50&orderBy=-set.releaseDate`;
  
  const response = await httpsGet(url);
  const cards = response.data || [];
  
  // Diversification : 1 carte par set
  const seenSets = new Set();
  const uniqueCards = [];
  
  for (const card of cards) {
    if (!seenSets.has(card.set.id)) {
      seenSets.add(card.set.id);
      uniqueCards.push(card);
      if (uniqueCards.length >= limit) break;
    }
  }
  
  return uniqueCards;
}

/**
 * Vérifie si un Pokémon a déjà des cartes téléchargées
 */
async function checkPokemonDownloaded(pokedexNumber) {
  const pokemonDir = path.join(CONFIG.OUTPUT_DIR, String(pokedexNumber).padStart(4, '0'));
  
  try {
    const files = await fs.readdir(pokemonDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    const hasMetadata = files.includes('metadata.json');
    
    return {
      exists: pngFiles.length > 0,
      count: pngFiles.length,
      hasMetadata,
      dir: pokemonDir
    };
  } catch {
    return {
      exists: false,
      count: 0,
      hasMetadata: false,
      dir: pokemonDir
    };
  }
}

/**
 * Télécharge les cartes d'un Pokémon
 */
async function downloadPokemonCards(pokedexNumber, options = {}) {
  const { limit = CONFIG.MAX_CARDS_PER_POKEMON, force = false, useGithub = false, cardsByPokedex = null } = options;
  
  const pokemonDir = path.join(CONFIG.OUTPUT_DIR, String(pokedexNumber).padStart(4, '0'));
  await fs.mkdir(pokemonDir, { recursive: true });
  
  if (!force) {
    const existing = await checkPokemonDownloaded(pokedexNumber);
    if (existing.exists && existing.hasMetadata) {
      return { skipped: true, count: existing.count };
    }
  }
  
  let cards;
  
  if (useGithub && cardsByPokedex) {
    const allCards = cardsByPokedex.get(pokedexNumber);
    
    if (!allCards || allCards.length === 0) {
      await fs.writeFile(path.join(pokemonDir, '.empty'), 
        `No cards found in GitHub data at ${new Date().toISOString()}`
      );
      return { skipped: false, count: 0 };
    }
    
    cards = diversifyCards(allCards, limit);
    
  } else {
    log.info(`Récupération des cartes pour Pokémon #${pokedexNumber}...`);
    
    try {
      cards = await retryWithBackoff(() => fetchPokemonCards(pokedexNumber, limit));
    } catch (error) {
      await fs.writeFile(path.join(pokemonDir, '.empty'), 
        `API failed at ${new Date().toISOString()}\nError: ${error.message}`
      );
      throw error;
    }
    
    if (cards.length === 0) {
      await fs.writeFile(path.join(pokemonDir, '.empty'), 
        `No cards found at ${new Date().toISOString()}`
      );
      return { skipped: false, count: 0 };
    }
  }
  
  const metadata = {
    pokedexNumber,
    cards: [],
    downloadedAt: new Date().toISOString(),
  };
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const filename = `${String(i + 1).padStart(2, '0')}.png`;
    const filepath = path.join(pokemonDir, filename);
    
    const imageUrl = useGithub ? card.imageSmall : card.images.small;
    
    if (!imageUrl) {
      log.warning(`  [${i + 1}/${cards.length}] ${card.name} - Pas d'URL image`);
      continue;
    }
    
    try {
      await retryWithBackoff(() => downloadImage(imageUrl, filepath));
      
      metadata.cards.push({
        filename,
        cardId: card.id,
        name: card.name,
        set: useGithub ? card.set : card.set.name,
        rarity: card.rarity,
        imageUrl: imageUrl,
      });
      
      log.success(`  [${i + 1}/${cards.length}] ${card.name} - ${useGithub ? card.set : card.set.name}`);
    } catch (error) {
      log.error(`  Échec téléchargement: ${card.name} - ${error.message}`);
    }
    
    if (i < cards.length - 1) {
      await delay(100);
    }
  }
  
  await fs.writeFile(
    path.join(pokemonDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  return { skipped: false, count: metadata.cards.length };
}

/**
 * Télécharge les cartes pour une plage de Pokémon
 */
async function downloadRange(start, end, options = {}) {
  log.title(`🃏 Téléchargement des cartes Pokémon #${start} à #${end}`);
  
  let cardsByPokedex = null;
  
  if (options.useGithub) {
    const hasRepo = await checkGithubRepo();
    
    if (!hasRepo) {
      await cloneGithubRepo();
    } else {
      log.info('Repo GitHub déjà cloné');
    }
    
    cardsByPokedex = await parseGithubCards();
    options.cardsByPokedex = cardsByPokedex;
  }
  
  const stats = {
    total: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    cardsDownloaded: 0,
  };
  
  const pokemonList = [];
  for (let i = start; i <= end; i++) {
    pokemonList.push(i);
    stats.total++;
  }
  
  const concurrent = options.concurrent || 1;
  
  if (concurrent > 1) {
    log.info(`Mode concurrent: ${concurrent} téléchargements simultanés`);
    
    const chunks = [];
    for (let i = 0; i < pokemonList.length; i += concurrent) {
      chunks.push(pokemonList.slice(i, i + concurrent));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (pokedexNumber) => {
        try {
          const result = await downloadPokemonCards(pokedexNumber, options);
          
          if (result.skipped) {
            stats.skipped++;
          } else {
            stats.success++;
            stats.cardsDownloaded += result.count;
          }
        } catch (error) {
          stats.failed++;
          log.error(`Échec pour Pokémon #${pokedexNumber}: ${error.message}`);
        }
      });
      
      await Promise.all(promises);
      
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await delay(options.delay || CONFIG.REQUEST_DELAY);
      }
    }
  } else {
    for (const pokedexNumber of pokemonList) {
      try {
        const result = await downloadPokemonCards(pokedexNumber, options);
        
        if (result.skipped) {
          stats.skipped++;
        } else {
          stats.success++;
          stats.cardsDownloaded += result.count;
        }
      } catch (error) {
        stats.failed++;
        log.error(`Échec pour Pokémon #${pokedexNumber}: ${error.message}`);
      }
      
      if (pokedexNumber < end) {
        await delay(options.delay || CONFIG.REQUEST_DELAY);
      }
    }
  }
  
  const metadata = await loadMetadata();
  await saveMetadata(metadata);
  
  log.title('📊 Résumé du téléchargement');
  console.log(`Total Pokémon traités : ${stats.total}`);
  console.log(`${colors.green}Succès              : ${stats.success}${colors.reset}`);
  console.log(`${colors.yellow}Déjà présents       : ${stats.skipped}${colors.reset}`);
  console.log(`${colors.red}Échecs              : ${stats.failed}${colors.reset}`);
  console.log(`${colors.cyan}Cartes téléchargées : ${stats.cardsDownloaded}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════
// NETTOYAGE
// ═══════════════════════════════════════════════════════════════

async function cleanAll() {
  log.title('🗑️  Nettoyage des cartes téléchargées');
  
  try {
    await fs.rm(CONFIG.OUTPUT_DIR, { recursive: true, force: true });
    log.success('Toutes les cartes ont été supprimées');
  } catch (error) {
    log.error(`Erreur lors du nettoyage: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// VÉRIFICATION
// ═══════════════════════════════════════════════════════════════

async function verify() {
  log.title('🔍 Vérification de l\'intégrité des fichiers');
  
  try {
    const dirs = await fs.readdir(CONFIG.OUTPUT_DIR);
    let totalCards = 0;
    let totalPokemon = 0;
    
    for (const dir of dirs) {
      if (!/^\d{4}$/.test(dir)) continue;
      
      const pokemonDir = path.join(CONFIG.OUTPUT_DIR, dir);
      const files = await fs.readdir(pokemonDir);
      const pngFiles = files.filter(f => f.endsWith('.png'));
      
      totalPokemon++;
      totalCards += pngFiles.length;
      
      log.info(`Pokémon #${dir}: ${pngFiles.length} cartes`);
    }
    
    log.success(`\nTotal: ${totalPokemon} Pokémon, ${totalCards} cartes`);
    
  } catch (error) {
    log.error(`Erreur lors de la vérification: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════════════

async function showStats() {
  log.title('📊 Statistiques du cache TCG');
  
  try {
    const metadata = await loadMetadata();
    
    console.log(`Dernière mise à jour : ${metadata.lastUpdate || 'Jamais'}`);
    console.log(`Version              : ${metadata.version}`);
    
    // Compter les fichiers
    const dirs = await fs.readdir(CONFIG.OUTPUT_DIR).catch(() => []);
    let totalCards = 0;
    let totalSize = 0;
    
    for (const dir of dirs) {
      if (!/^\d{4}$/.test(dir)) continue;
      
      const pokemonDir = path.join(CONFIG.OUTPUT_DIR, dir);
      const files = await fs.readdir(pokemonDir);
      
      for (const file of files) {
        if (file.endsWith('.png')) {
          const stat = await fs.stat(path.join(pokemonDir, file));
          totalSize += stat.size;
          totalCards++;
        }
      }
    }
    
    console.log(`Pokémon cachés      : ${dirs.filter(d => /^\d{4}$/.test(d)).length}`);
    console.log(`Cartes téléchargées : ${totalCards}`);
    console.log(`Taille totale       : ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    log.error(`Erreur: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PARSING DES ARGUMENTS CLI
// ═══════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    download: false,
    downloadMissing: false,
    clean: false,
    cleanEmpty: false,
    verify: false,
    stats: false,
    analyze: false,
    range: null,
    all: false,
    limit: CONFIG.MAX_CARDS_PER_POKEMON,
    force: false,
    retryFailed: false,
    delay: CONFIG.REQUEST_DELAY,
    useGithub: false,
    concurrent: 1,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--download':
        options.download = true;
        break;
      case '--download-missing':
        options.downloadMissing = true;
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--clean-empty':
        options.cleanEmpty = true;
        break;
      case '--verify':
        options.verify = true;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--analyze':
        options.analyze = true;
        break;
      case '--all':
        options.all = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--retry-failed':
        options.retryFailed = true;
        break;
      case '--use-github':
        options.useGithub = true;
        break;
      case '--range':
        if (i + 1 < args.length) {
          const [start, end] = args[++i].split('-').map(Number);
          options.range = { start, end };
        }
        break;
      case '--limit':
        if (i + 1 < args.length) {
          options.limit = parseInt(args[++i], 10);
        }
        break;
      case '--delay':
        if (i + 1 < args.length) {
          options.delay = parseInt(args[++i], 10);
        }
        break;
      case '--concurrent':
        if (i + 1 < args.length) {
          options.concurrent = parseInt(args[++i], 10);
        }
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}🃏 Gestionnaire de cache TCG Pokémon${colors.reset}

${colors.bright}Usage:${colors.reset}
  node download-tcg-cards.js [options]

${colors.bright}Options principales:${colors.reset}
  --download              Télécharge les cartes (tous ou selon --range)
  --download-missing      Télécharge UNIQUEMENT les cartes manquantes
  --analyze               Analyse le cache et affiche ce qui manque
  --clean                 Supprime toutes les cartes
  --clean-empty           Nettoie les dossiers vides et marqueurs d'échec
  --verify                Vérifie l'intégrité des fichiers
  --stats                 Affiche les statistiques

${colors.bright}Options de téléchargement:${colors.reset}
  --range N-M             Pokédex #N à #M (ex: --range 1-151)
  --all                   Tous les Pokémon (1-1025)
  --limit N               Max de cartes par Pokémon (défaut: 10)
  --force                 Force le re-téléchargement même si présent
  --retry-failed          Ré-essaie les Pokémon marqués comme échecs API
  --delay N               Délai entre requêtes en ms (défaut: 500)
  --use-github            Utilise le repo GitHub au lieu de l'API
  --concurrent N          Nombre de téléchargements simultanés (défaut: 1)

${colors.bright}Exemples:${colors.reset}
  ${colors.green}# Télécharger avec le repo GitHub (plus rapide)${colors.reset}
  node download-tcg-cards.js --download --range 1-151 --use-github

  ${colors.green}# Télécharger avec 5 requêtes simultanées${colors.reset}
  node download-tcg-cards.js --download --range 1-151 --concurrent 5

  ${colors.green}# GitHub + concurrent pour vitesse maximale${colors.reset}
  node download-tcg-cards.js --download --range 1-151 --use-github --concurrent 10

  ${colors.green}# Télécharger les manquants avec GitHub${colors.reset}
  node download-tcg-cards.js --download-missing --range 1-151 --use-github

  ${colors.green}# API classique avec concurrent${colors.reset}
  node download-tcg-cards.js --download-missing --range 1-151 --concurrent 3

${colors.bright}Workflow recommandé:${colors.reset}
  ${colors.yellow}1.${colors.reset} node download-tcg-cards.js --download --range 1-151 --use-github --concurrent 10
  ${colors.yellow}2.${colors.reset} node download-tcg-cards.js --analyze --range 1-151
  ${colors.yellow}3.${colors.reset} node download-tcg-cards.js --download-missing --range 1-151 --use-github --retry-failed
  ${colors.yellow}4.${colors.reset} node download-tcg-cards.js --stats
  `);
}

// ═══════════════════════════════════════════════════════════════
// POINT D'ENTRÉE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs();
  
  // Créer le dossier de sortie
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  
  // Exécuter l'action demandée
  if (options.clean) {
    await cleanAll();
  } else if (options.cleanEmpty) {
    await cleanEmpty();
  } else if (options.verify) {
    await verify();
  } else if (options.stats) {
    await showStats();
  } else if (options.analyze) {
    if (options.all) {
      await analyzeCache(1, 1025);
    } else if (options.range) {
      await analyzeCache(options.range.start, options.range.end);
    } else {
      log.error('Veuillez spécifier --range N-M ou --all');
      showHelp();
      process.exit(1);
    }
  } else if (options.downloadMissing) {
    if (options.all) {
      await downloadMissing(1, 1025, options);
    } else if (options.range) {
      await downloadMissing(options.range.start, options.range.end, options);
    } else {
      log.error('Veuillez spécifier --range N-M ou --all');
      showHelp();
      process.exit(1);
    }
  } else if (options.download) {
    if (options.all) {
      await downloadRange(1, 1025, options);
    } else if (options.range) {
      await downloadRange(options.range.start, options.range.end, options);
    } else {
      log.error('Veuillez spécifier --range N-M ou --all');
      showHelp();
      process.exit(1);
    }
  } else {
    showHelp();
  }
}

// Lancer le script
main().catch(error => {
  log.error(`Erreur fatale: ${error.message}`);
  console.error(error);
  process.exit(1);
});
