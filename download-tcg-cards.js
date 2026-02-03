#!/usr/bin/env node

/**
 * Gestionnaire de cache Pokémon TCG
 *
 * Script CLI pour télécharger, vérifier et maintenir un cache local
 * d’images de cartes Pokémon TCG depuis l’API officielle pokemontcg.io.
 *
 * Les cartes sont stockées par numéro de Pokédex, avec métadonnées
 * et mécanisme intelligent de reprise après échec.
 *
 * ─────────────────────────────────────────────────────────────
 * STRUCTURE DU CACHE
 *
 * public/tcg-cards/
 * ├── 0001/
 * │   ├── 01.png
 * │   ├── 02.png
 * │   ├── metadata.json
 * ├── 0002/
 * │   ├── .empty        ← échec API ou aucune carte trouvée
 * ├── metadata.json     ← métadonnées globales
 *
 * ─────────────────────────────────────────────────────────────
 * OPTIONS PRINCIPALES
 *
 * --download                 Télécharge les cartes Pokémon (tous ou selon --range / --all)
 *
 * --download-missing         Télécharge UNIQUEMENT les Pokémon manquants ou incomplets
 *                            (ne retélécharge pas ceux déjà complets)
 *
 * --analyze                  Analyse le cache existant et affiche : 
 *                            Pokémon complets - Incomplets - Échecs API (.empty) - Manquants
 *
 * --verify                   Vérifie l’intégrité du cache (nombre de cartes par Pokémon)
 *
 * --stats                    Affiche les statistiques globales (taille, nombre de cartes)
 *
 * --clean                    Supprime TOUT le cache (⚠ irréversible)
 *
 * --clean-empty              Supprime uniquement les dossiers vides ou marqués .empty
 *
 * --range N-M                Télécharge ou analyse une plage de Pokémon
 *
 * --all                      Tous les Pokémon existants (1 → 1025)
 *
 * --limit N                  Nombre maximum de cartes par Pokémon (défaut: 10)
 *
 * --force                    Force le re-téléchargement même si les cartes existent déjà
 *
 * --retry-failed             Ré-essaie les Pokémon précédemment marqués en échec (.empty)
 *
 * --delay N                  Délai entre requêtes API en millisecondes (défaut: 500)
 *
 * ─────────────────────────────────────────────────────────────
 * EXEMPLES
 *
 * # Analyser l’état du cache (Gen 1)
 * node download-tcg-cards.js --analyze --range 1-151
 *
 * # Télécharger UNIQUEMENT les Pokémon manquants
 * node download-tcg-cards.js --download-missing --range 1-151
 *
 * # Télécharger tous les Pokémon sans retélécharger les existants
 * node download-tcg-cards.js --download-missing --all
 *
 * # Ré-essayer les Pokémon ayant échoué précédemment
 * node download-tcg-cards.js --download-missing --range 1-151 --retry-failed
 *
 * # Forcer un re-téléchargement complet (⚠)
 * node download-tcg-cards.js --download --range 1-151 --force
 *
 * ─────────────────────────────────────────────────────────────
 * 🧠 COMPORTEMENT INTELLIGENT
 *
 * ✔ Télécharge 1 carte par set pour maximiser la diversité
 * ✔ Ignore automatiquement les Pokémon déjà complets
 * ✔ Reprend les téléchargements interrompus
 * ✔ Gère les erreurs API avec retry + backoff exponentiel
 *
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
	  MAX_CARDS_PER_POKEMON: 10,
	  REQUEST_DELAY: 500, // ms entre chaque requête
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

				  if (status.exists && status.hasMetadata && status.count > 0) {
						analysis.complete.push({ num: i, count: status.count });

				  } else if (status.exists && status.isBroken) {
						analysis.incomplete.push(i);

				  } else if (status.exists && status.isEmptyMarker) {
						analysis.empty.push(i);

				  } else {
						analysis.missing.push(i);
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
				  // Optionnellement ré-essayer les .empty si --retry-failed
				  ...(options.retryFailed ? analysis.empty : [])
			].sort((a, b) => a - b);

			if (toDownload.length === 0) {
				  log.success('Tous les Pokémon sont déjà téléchargés ! 🎉');
				  return;
			}

			log.title(`📥 Téléchargement des ${toDownload.length} Pokémon manquants`);

			const stats = {
				  total: toDownload.length,
				  success: 0,
				  failed: 0,
				  cardsDownloaded: 0,
			};

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

				  // Délai entre chaque Pokémon
				  await delay(options.delay || CONFIG.REQUEST_DELAY);
			}

			// Afficher les statistiques
			log.title('📊 Résumé du téléchargement');
			console.log(`Pokémon à traiter     : ${stats.total}`);
			console.log(`${colors.green}Succès                : ${stats.success}${colors.reset}`);
			console.log(`${colors.red}Échecs                : ${stats.failed}${colors.reset}`);
			console.log(`${colors.cyan}Cartes téléchargées   : ${stats.cardsDownloaded}${colors.reset}`);

			// Sauvegarder les métadonnées globales
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
// TÉLÉCHARGEMENT DES CARTES
// ═══════════════════════════════════════════════════════════════

/**
	  * Vérifie si un Pokémon a déjà des cartes téléchargées
	  */
	  async function checkPokemonDownloaded(pokedexNumber) {
			const pokemonDir = path.join(
				  CONFIG.OUTPUT_DIR,
				  String(pokedexNumber).padStart(4, '0')
			);

			try {
				  const files = await fs.readdir(pokemonDir);

				  const pngFiles = files.filter(f => f.endsWith('.png'));
				  const hasMetadata = files.includes('metadata.json');
				  const hasEmptyMarker = files.includes('.empty');

				  return {
						exists: true,
						count: pngFiles.length,
						hasMetadata,
						isEmptyMarker: hasEmptyMarker,
						isBroken: pngFiles.length === 0 && !hasEmptyMarker,
						dir: pokemonDir
				  };
			} catch {
				  return {
						exists: false,
						count: 0,
						hasMetadata: false,
						isEmptyMarker: false,
						isBroken: false,
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
			const { limit = CONFIG.MAX_CARDS_PER_POKEMON, force = false } = options;

			// Créer le dossier pour ce Pokémon
			const pokemonDir = path.join(CONFIG.OUTPUT_DIR, String(pokedexNumber).padStart(4, '0'));
			await fs.mkdir(pokemonDir, { recursive: true });

			// Vérifier si déjà téléchargé
			if (!force) {
				  const existing = await checkPokemonDownloaded(pokedexNumber);
				  if (existing.exists && existing.hasMetadata) {
						log.info(`Pokémon #${pokedexNumber} déjà téléchargé (${existing.count} cartes)`);
						return { skipped: true, count: existing.count };
				  }
			}

			// Récupérer les cartes via l'API
			log.info(`Récupération des cartes pour Pokémon #${pokedexNumber}...`);

			let cards;
			try {
				  cards = await retryWithBackoff(() => fetchPokemonCards(pokedexNumber, limit));
			} catch (error) {
				  // Créer un fichier .empty pour marquer qu'on a essayé
				  await fs.writeFile(path.join(pokemonDir, '.empty'), 
						`API failed at ${new Date().toISOString()}\nError: ${error.message}`
				  );
				  throw error;
			}

			if (cards.length === 0) {
				  log.warning(`Aucune carte trouvée pour #${pokedexNumber}`);
				  // Créer un fichier .empty pour marquer qu'il n'y a vraiment pas de cartes
				  await fs.writeFile(path.join(pokemonDir, '.empty'), 
						`No cards found at ${new Date().toISOString()}`
				  );
				  return { skipped: false, count: 0 };
			}

			// Télécharger chaque carte
			const metadata = {
				  pokedexNumber,
				  cards: [],
				  downloadedAt: new Date().toISOString(),
			};

			for (let i = 0; i < cards.length; i++) {
				  const card = cards[i];
				  const filename = `${String(i + 1).padStart(2, '0')}.png`;
				  const filepath = path.join(pokemonDir, filename);

				  try {
						await retryWithBackoff(() => downloadImage(card.images.small, filepath));

						metadata.cards.push({
							  filename,
							  cardId: card.id,
							  name: card.name,
							  set: card.set.name,
							  rarity: card.rarity,
							  imageUrl: card.images.small,
						});

						log.success(`  [${i + 1}/${cards.length}] ${card.name} - ${card.set.name}`);
				  } catch (error) {
						log.error(`  Échec téléchargement: ${card.name} - ${error.message}`);
				  }

				  // Petit délai pour ne pas surcharger l'API
				  if (i < cards.length - 1) {
						await delay(100);
				  }
			}

			// Sauvegarder les métadonnées du Pokémon
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

			const stats = {
				  total: 0,
				  success: 0,
				  skipped: 0,
				  failed: 0,
				  cardsDownloaded: 0,
			};

			for (let i = start; i <= end; i++) {
				  stats.total++;

				  try {
						const result = await downloadPokemonCards(i, options);

						if (result.skipped) {
							  stats.skipped++;
						} else {
							  stats.success++;
							  stats.cardsDownloaded += result.count;
						}

				  } catch (error) {
						stats.failed++;
						log.error(`Échec pour Pokémon #${i}: ${error.message}`);
				  }

				  // Délai entre chaque Pokémon
				  if (i < end) {
						await delay(options.delay || CONFIG.REQUEST_DELAY);
				  }
			}

			// Sauvegarder les métadonnées globales
			const metadata = await loadMetadata();
			await saveMetadata(metadata);

			// Afficher les statistiques
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

			${colors.bright}Exemples:${colors.reset}
			${colors.green}# Analyser l'état actuel${colors.reset}
			node download-tcg-cards.js --analyze --range 1-151

			${colors.green}# Télécharger UNIQUEMENT les Pokémon manquants de la Gen 1${colors.reset}
			node download-tcg-cards.js --download-missing --range 1-151

			${colors.green}# Télécharger les manquants ET ré-essayer les échecs${colors.reset}
			node download-tcg-cards.js --download-missing --range 1-151 --retry-failed

			${colors.green}# Télécharger toute la Gen 1 (même si déjà présent)${colors.reset}
			node download-tcg-cards.js --download --range 1-151

			${colors.green}# Nettoyer les dossiers vides et ré-essayer${colors.reset}
			node download-tcg-cards.js --clean-empty
			node download-tcg-cards.js --download-missing --range 1-151

			${colors.green}# Télécharger avec plus de patience (délai augmenté)${colors.reset}
			node download-tcg-cards.js --download-missing --range 1-151 --delay 2000

			${colors.green}# Vérifier l'intégrité${colors.reset}
			node download-tcg-cards.js --verify

			${colors.green}# Afficher les stats${colors.reset}
			node download-tcg-cards.js --stats

			${colors.bright}Workflow recommandé pour gérer les échecs API:${colors.reset}
			${colors.yellow}1.${colors.reset} node download-tcg-cards.js --download --range 1-151
			${colors.yellow}2.${colors.reset} node download-tcg-cards.js --analyze --range 1-151
			${colors.yellow}3.${colors.reset} node download-tcg-cards.js --download-missing --range 1-151 --retry-failed
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
