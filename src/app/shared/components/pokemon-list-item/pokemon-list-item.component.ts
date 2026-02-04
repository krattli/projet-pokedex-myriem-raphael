import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Pokemon } from '../../../core/models';

@Component({
  selector: 'app-pokemon-list-item',
  standalone: true,
  templateUrl: './pokemon-list-item.component.html',
  styleUrls: ['./pokemon-list-item.component.css']
})
export class PokemonListItemComponent {
  @Input({ required: true }) pokemon!: Pokemon;
  @Input() showCaptureButton = false;
  @Input() isSelected = false;
  @Input() searchQuery = '';
  @Output() capture = new EventEmitter<Pokemon>();
  @Output() select = new EventEmitter<Pokemon>();

  private sanitizer = inject(DomSanitizer);

  getSpriteUrl(): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.pokedexNumber}.png`;
  }

  getTypeImageUrl(typeName: string): string {
    return `https://play.pokemonshowdown.com/sprites/types/${typeName}.png`;
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23eee" width="40" height="40"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">?</text></svg>';
  }

  onTypeImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getBST(): number {
    return this.pokemon.hp + this.pokemon.attack + this.pokemon.defense + this.pokemon.speed;
  }

  onSelect(): void {
    this.select.emit(this.pokemon);
  }

  onCapture(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.capture.emit(this.pokemon);
  }

  /**
   * Retourne le HTML avec mise en évidence (sans espaces)
   */
  getHighlightedHtml(text: string, query: string): SafeHtml {
    if (!query) return this.sanitizer.bypassSecurityTrustHtml(text);
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return this.sanitizer.bypassSecurityTrustHtml(text);
    
    // Échapper les caractères HTML pour éviter les injections
    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    const before = escapeHtml(text.substring(0, index));
    const match = escapeHtml(text.substring(index, index + query.length));
    const after = escapeHtml(text.substring(index + query.length));
    
    const html = `${before}<strong class="highlight">${match}</strong>${after}`;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
