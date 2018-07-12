import { Component, OnInit, Input } from '@angular/core';
import _ from 'lodash';

@Component({
  selector: 'app-profit-table',
  templateUrl: './profit-table.component.html',
  styleUrls: ['./profit-table.component.scss']
})
export class ProfitTableComponent implements OnInit {
  @Input() profits;
  _range = _.range(7)

  constructor() { }

  ngOnInit() {
  }

  add() {
    this.profits.push([0.0,0.0,0.0,0.0,1.0,"2018-05-08","2018-05-07"])
  }

  remove(index) {
    this.profits.splice(index, 1);
  }

}
