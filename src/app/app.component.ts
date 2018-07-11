import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import * as _ from 'lodash';

const margin = {top: 20, right: 40, bottom: 50, left: 40},
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
  @ViewChild('tooltip') _tooltip: ElementRef;

  svg: any;
  mask: any;
  data: number[];
  tooltip: any;

  ngAfterContentInit() {
    this.svg = d3.select(this._svg.nativeElement)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(d3.zoom().on('zoom', () => this.svg.attr("transform", d3.event.transform)));
    this.svg.append('rect')
      .attr('x', -margin.left)
      .attr('y', -margin.top)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('fill', '#ffffff');

    this.svg.append('clipPath')
      .attr('id', 'chartClip')
      .append('rect')
        .attr('x', 0)
        .attr('y', -margin.top)
        .attr('width', width)
        .attr('height', height + margin.top)
    this.mask = this.svg
       .append('g')
       .attr('clip-path', 'url(#chartClip)');
    this.tooltip = d3.select(this._tooltip.nativeElement)
      .style('opacity', 0);
    this.update_data();
  }

  public update_data() {
    this.data = _.times(_.random(50, 100), () => _.random(0., 100.));
    const y = d3.scaleLinear()
        .domain([_.min(this.data), _.max(this.data)])
        .range([height, 0]);
    const x = d3.scaleBand()
        .domain(_.range(_.size(this.data)))
        .range([0, width])
        .paddingInner(.1);
    const color = d3.scaleLinear()
      .domain([_.min(this.data), _.max(this.data)])
      .range(['red', 'orange']);
    const bar = this.mask.selectAll('.bar').data(this.data);
    const enteredBar = bar.enter().append('g')
      .attr('class', 'bar')
      .attr('transform', (d, i) => `translate(${width}, 0)`);
    const allBar = bar.merge(enteredBar);
    const transition = selection => selection.duration(500);
    const init_rect = selection => selection.append('rect')
      .attr('class', 'rect')
      .attr('height', 0)
      .attr('width', 0)
      .attr('transform', `translate(0, ${height})`)
      .on("mouseover", (d, idx, nodes) => {
        this.tooltip.style('opacity', 1);
        const node = d3.select(nodes[idx]);
        node.transition().duration(100)
          .attr('fill', '#ffffff')
          .attr('stroke', d => color(d));
      })
      .on("mousemove", (d, idx, nodes) => this.tooltip
          .style('left', `${d3.event.pageX}px`)
          .style('top', `${d3.event.pageY}px`)
          .text(`Data: ${d}`))
      .on("mouseout", (d, idx, nodes) => {
        const node = d3.select(nodes[idx]);
        this.tooltip.style('opacity', 0);
        node.transition().duration(100)
          .attr('fill', color(d))
          .attr('stroke', '');
      })
    const update_rect = selection =>  selection.transition().call(transition)
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d))
      .attr('transform', (d, i) => `translate(0, ${y(d)})`)
      .attr('fill', d => color(d))
    const init_value = selection => selection.append('text')
      .attr('class', 'value')
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('x', x.bandwidth() / 2)
      .text('0');
    const update_value = selection => selection.transition().call(transition)
      .tween('text', (d, idx, group) => {
        const that = d3.select(group[idx]);
        let i = d3.interpolateNumber(that.text(), d);
        return t => that.text(Math.round(i(t)));
      })
      .attr('x', x.bandwidth() / 2)
      .attr('y', d => y(d) - 5);
    enteredBar.call(init_rect);
    enteredBar.call(init_value);
    allBar.select('.rect').call(update_rect);
    allBar.select('.value').call(update_value);
    bar.exit()
      .transition()
      .call(transition)
      .attr('transform', (d, i) => `translate(${- margin.left - x.bandwidth()}, 0)`)
      .remove();
    allBar.transition().call(transition)
      .attr('transform', (d, i) => `translate(${x(i)}, 0)`);
    this.svg.selectAll('.xAxis').data([0]).enter().append('g').attr('transform', `translate(0, ${height})`)
      .attr('class', 'xAxis');
    this.svg.selectAll('.yAxis').data([0]).enter().append('g').attr('transform', `translate(0, 0})`)
      .attr('class', 'yAxis');
    this.svg.select('.xAxis')
      .transition()
      .call(transition)
      .call(d3.axisBottom(x));
    this.svg.select('.yAxis')
      .transition()
      .call(transition)
      .call(d3.axisLeft(y));
  }
}
