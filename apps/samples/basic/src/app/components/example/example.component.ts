import { Component, OnInit } from '@angular/core';
import { ExampleService } from '../../services/example.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.css'],
})
export class ExampleComponent implements OnInit {
  constructor(private readonly service: ExampleService) {}
  private readonly subscription = this.service.interval$.subscribe((data) => (this.data = data));
  public data?: number;

  @Override()
  public ngOnInit(): void {}

  public unsubscribe(): void {
    this.subscription.unsubscribe();
  }
}
