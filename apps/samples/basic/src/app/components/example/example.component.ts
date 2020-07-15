import { Component, OnInit } from '@angular/core';
import { ExampleService } from '../../services/example.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
})
export class ExampleComponent implements OnInit {
  constructor(private readonly service: ExampleService) {}
  public readonly data$ = this.service.interval$;

  @Override()
  public ngOnInit(): void {}
}
