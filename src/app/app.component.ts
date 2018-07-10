import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import * as _ from 'lodash';

const margin = {top: 20, right: 40, bottom: 10, left: 40},
  width = 1280,
  height = 720 - margin.top - margin.bottom;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentInit {
  title = 'app';
  @ViewChild('svg') _svg: ElementRef;

  svg: any;
  data: number[];

  ngAfterContentInit() {
    this.svg = d3.select(this._svg.nativeElement)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    this.update_data();
  }

  public update_data() {
    this.data = _.times(100, () => _.random(0., 100.));
    const y = d3.scaleLinear()
        .domain([_.min(this.data), _.max(this.data)])
        .range([0, height]);
    const x = d3.scaleBand()
        .domain(_.range(_.size(this.data)))
        .range([0, width])
        .paddingInner(.1);
    const color = d3.scaleLinear()
      .domain([_.min(this.data), _.max(this.data)])
      .range(['red', 'orange']);
    const bar = this.svg.selectAll('.bar').data(this.data);
    const enteredBar = bar.enter().append('g')
        .attr('class', 'bar')
        .attr('transform', (d, i) => `translate(${width}, 0)`);
    const allBar = bar.merge(enteredBar);
    const transition = selection => selection.duration(500);
    const init_rect = selection => selection.append('rect')
      .attr('class', 'rect')
      .attr('height', 0)
      .attr('width', 0)
      .attr('transform', `translate(0, ${height})`);
    const update_rect = selection =>  selection.transition().call(transition)
      .attr('width', x.bandwidth())
      .attr('height', d => y(d))
      .attr('transform', (d, i) => `translate(0, ${height - y(d)})`)
      .attr('fill', d => color(d));
    const init_value = selection => selection.append('text')
      .attr('class', 'value')
      .attr('y', height - 5)
      .text('0');
    const update_value = selection => selection.transition().call(transition)
      .tween('text', (d, idx, group) => {
        const that = d3.select(group[idx]);
        let i = d3.interpolateNumber(that.text(), d);
        return t => that.text(Math.round(i(t)));
      })
      .attr('y', d => height - y(d) - 5);
    enteredBar.call(init_rect);
    enteredBar.call(init_value);
    allBar.select('.rect').call(update_rect);
    allBar.select('.value').call(update_value);
    bar.exit()
      .transition()
      .call(transition)
      .attr('transform', (d, i) => `translate(${-x.bandwidth()}, 0)`)
      .remove();
    allBar.transition().call(transition)
      .attr('transform', (d, i) => `translate(${x(i.toString())}, 0)`);
  }
}
