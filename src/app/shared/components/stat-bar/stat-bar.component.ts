import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-bar',
  standalone: true,
  templateUrl: './stat-bar.component.html',
  styleUrls: ['./stat-bar.component.css']
})
export class StatBarComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number;
  @Input() maxValue: number = 255;

  getPercentage(): number {
    return Math.min((this.value / this.maxValue) * 100, 100);
  }

  getColor(): string {
    const percentage = this.getPercentage();
    if (percentage < 30) return '#f34444';
    if (percentage < 50) return '#ff7f0f';
    if (percentage < 70) return '#ffdd57';
    if (percentage < 90) return '#a0e515';
    return '#23cd5e';
  }
}
