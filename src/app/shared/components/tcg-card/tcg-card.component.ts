import { Component, Input, inject, ElementRef, ViewChild, signal } from '@angular/core';
import { TcgCard, PokemonTcgService } from '../../../core/services/pokemon-tcg.service';

@Component({
  selector: 'app-tcg-card',
  standalone: true,
  imports: [],
  templateUrl: './tcg-card.component.html',
  styleUrls: ['./tcg-card.component.css']
})
export class TcgCardComponent {
  @Input({ required: true }) card!: TcgCard;
  
  @ViewChild('cardEl') cardEl!: ElementRef<HTMLDivElement>;
  
  private tcgService = inject(PokemonTcgService);
  
  rotateX = 0;
  rotateY = 0;
  glareX = 50;
  glareY = 50;
  isHovered = false;
  
  // État de chargement de l'image
  imageLoaded = signal(false);
  imageError = signal(false);

  onMouseMove(event: MouseEvent): void {
    if (!this.cardEl) return;
    
    const card = this.cardEl.nativeElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotation max de 25 degrés
    this.rotateY = ((x - centerX) / centerX) * 25;
    this.rotateX = ((centerY - y) / centerY) * 25;
    
    // Position du reflet holographique
    this.glareX = (x / rect.width) * 100;
    this.glareY = (y / rect.height) * 100;
  }

  onMouseEnter(): void {
    this.isHovered = true;
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.rotateX = 0;
    this.rotateY = 0;
    this.glareX = 50;
    this.glareY = 50;
  }

  onClick(): void {
    // Utiliser le service global pour ouvrir la modale en plein milieu de l'écran
    this.tcgService.openCard(this.card);
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  onImageError(): void {
    this.imageError.set(true);
    this.imageLoaded.set(true); // On cache le loader
  }
}
