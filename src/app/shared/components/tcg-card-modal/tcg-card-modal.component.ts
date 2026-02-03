import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { TcgCard } from '../../../core/services/pokemon-tcg.service';

@Component({
  selector: 'app-tcg-card-modal',
  standalone: true,
  imports: [],
  templateUrl: './tcg-card-modal.component.html',
  styleUrls: ['./tcg-card-modal.component.css']
})
export class TcgCardModalComponent {
  @Input({ required: true }) card!: TcgCard;
  @Output() closeModal = new EventEmitter<void>();
  
  rotateX = 0;
  rotateY = 0;
  glareX = 50;
  glareY = 50;
  isHovered = false;
  isClosing = false;

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  onMouseMove(event: MouseEvent, cardEl: HTMLElement): void {
    const rect = cardEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotation max de 15 degrés (moins fort car la carte est grande)
    this.rotateY = ((x - centerX) / centerX) * 15;
    this.rotateX = ((centerY - y) / centerY) * 15;
    
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

  close(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.closeModal.emit();
    }, 300);
  }
}
