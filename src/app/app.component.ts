import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as d3 from 'd3';
import * as _ from 'lodash';
import * as moment from 'moment';

const margin = {top: 20, right: 40, bottom: 50, left: 40},
  width = 1280,
  height = 720;

const get_data = data => _.zip(...
  _.chain(['open', 'close', 'low', 'high', 'date', 'volume', 'code'])
    .map(k => _.values(data[k]))
    .value()
  ).map(d => ({
    open: d[0], close: d[1], low: d[2], high: d[3],
    date: moment(d[4]), volume: d[5], code: d[6],
    _date_string: d[4]
  }));

const get_factor = (data, profit) => {
  _.forEach(data, d => d.factor = 1);
  _.forEach(profit, p => {
    const idx = _.findIndex(data, (d: Stock) => d._date_string == p[6]);
    if (idx != -1) {
      const close = data[idx].close;
      const factor = close / ((
        close
        + p[1] * p[0] / 10
        - p[4] / 10
      ) / (1 + (p[0] + p[2] + p[3]) / 10));
      if (data[idx + 1]) data[idx + 1].factor = factor;
    }
  });
  _.forEach(data, (d, idx: number) => { if (idx > 0) d.factor *= data[idx - 1].factor });
  return data;
}

const apply_factor = (data, std = 1) => _.map(data, d => ({
  open: d.open * d.factor * std, close: d.close * d.factor * std,
  low: d.low * d.factor * std, high: d.high * d.factor * std,
  date: d.date, volume: d.volume, code: d.code
}));

// 除权价＝ (除权前一日收盘价＋配股价Ｘ配股比率－每股派息) / (１+配股比率+送股比率)

interface Stock {
  open: number;
  close: number;
  low: number;
  high: number;
  date: any;
  volume: number;
  code: string;
  _date_string: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentInit {
  title = 'app';
  @ViewChild('svg') _svg: ElementRef;
  @ViewChild('tooltip') _tooltip: ElementRef;

  code: string = "603019";
  startDate: string = "2015-01-01";
  endDate: string = "2018-07-10";

  tooltip: any;

  loading = false;

  factored_data: any;
  profit_day: any = [
    [0.0,0.0,0.0,0.0,1.0,"2018-05-08","2018-05-07"],
    [0.0,0.0,0.0,0.0,0.8,"2017-05-11","2017-05-10"],
    [0.0,0.0,5.0,5.0,1.4,"2016-04-25","2016-04-22"],
    [0.0,0.0,0.0,0.0,0.8,"2015-06-09","2015-06-08"]
  ];

  constructor(private http: HttpClient) {
  }

  ngAfterContentInit() {
  }

  init_data(data) {
    d3.select(this._svg.nativeElement).selectAll('*').remove();
    const svg = d3.select(this._svg.nativeElement)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
    svg.append('rect')
      .attr('x', -margin.left)
      .attr('y', -margin.top)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('fill', '#ffffff');
    svg.append('clipPath')
      .attr('id', 'chartClip')
      .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
    const chartMask = svg.append('g');
    const chartContent = chartMask
       .append('g')
       .attr('clip-path', 'url(#chartClip)');
    chartMask.append('use')
      .attr('xlink:href', "#tooltip");
    const x = d3.scaleTime()
      .domain([
        moment(moment.min(_.map(data, 'date'))).subtract(1, 'day'),
        moment(moment.max(_.map(data, 'date'))).add(1, 'day')
      ])
      .range([0, width])
      .nice();
    const y = d3.scaleLinear()
      .domain([
        _.minBy(data, 'high')['high'],
        _.maxBy(data, 'low')['low']
      ])
      .range([height, 0])
      .nice();
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
    const gX = chartMask.append('g')
      .attr('class', 'xAxis')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);
    const gY = chartMask.append('g')
      .attr('class', 'yAxis')
      .call(yAxis);
    const transform_to = (x, h1, h2) => selection => selection
      .attr('transform', d => `translate(${x}, ${Math.min(h1(d), h2(d))})`)
      .attr('height', d => Math.abs(h1(d) - h2(d)));
    const init_candlestick = g => g
      .attr('class', 'candlestick')
    const init_bar = rect => rect
      .attr('class', 'bar')
    const init_line = line => line
      .attr('class', 'line')
    const update = () => {
      const transform_axis = () => {
        if (transform) {
          const zoom_x = transform.rescaleX(x);
          let min_y = 10000000, max_y = 0;
          chartContent.selectAll('.candlestick')
            .filter(d => 0 <= zoom_x(d.date) && zoom_x(d.date) <= width)
            .each(d => {
              min_y = Math.min(min_y, d.low)
              max_y = Math.max(max_y ,d.high)
            });
          return {
            zoom_x,
            zoom_y: y.copy().domain([min_y, max_y])
          }
        } else {
          return {
            zoom_x: x,
            zoom_y: y
          }
        }
      };
      const transform = d3.event ? d3.event.transform : null;
      const zoom_scale = transform ? transform.k : 1;
      const { zoom_x, zoom_y } = transform_axis();
      const barWidth = () => width / _.size(data) * zoom_scale * 0.5;
      const update_candlestick = g => g
        .attr('transform', d => `translate(${zoom_x(d.date)}, 0)`);
      const update_bar = rect => rect
        .call(transform_to(-barWidth() / 2, d => zoom_y(d.open), d => zoom_y(d.close)))
        .attr('width', barWidth())
        .attr('fill', d => d.open > d.close ? 'red' : 'green');
      const update_line = line => line
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', d => zoom_y(d.high))
        .attr('y2', d => zoom_y(d.low))
        .attr('stroke', d => d.open > d.close ? 'red' : 'green');
      const init_tooltip = selection => {
        const t_height = 90;
        const tooltip = selection;
        const r = n => Math.round(n * 100) / 100;
        const rect = tooltip
          .append('rect')
          .attr('height', t_height)
          .attr('fill', '#111111')
          .attr('fill-opacity', 0.5)
          .attr('stroke', '#000000')
          .attr('rx', 2)
          .attr('ry', 2);
      tooltip
        .append('text')
          .attr('class', 'value')
          .attr('alignment-baseline', 'hanging')
          .attr('transform', `translate(5, 5)`)
          .attr('fill', '#ffffff')
          .selectAll('.field')
          .data(d => [
            `${d.date.format('YY-MM-DD')}`,
            `最高价: ${r(d.high)}`,
            `最低价: ${r(d.low)}`,
            `开盘: ${r(d.open)}`,
            `收盘: ${r(d.close)}`
          ])
          .enter()
          .append('tspan')
          .attr('dy', (d, i) => 15)
          .attr('x', 0)
          .text(d => d)
        rect.attr('width', 100);
      };
      const candlesticks = chartContent
        .selectAll('.candlestick')
        .data(data, d => d.date.unix())
        .enter()
          .append('g')
          .call(init_candlestick)
          .on('mouseover', (d, idx, nodes) => {
            const candlestick = d3.select(nodes[idx]);
            const tooltip = chartMask.append('g').attr('id', 'tooltip');
            tooltip.append('g').data([d]).call(init_tooltip)
            candlestick.on('mousemove', () => {
              let [_x, _y] = d3.mouse(chartContent.node());
              tooltip.attr('transform', `translate(${_x + 10}, ${_y + 10})`)
            });
            candlestick.on('mouseout', () => tooltip.remove());
            candlestick.on('remove', () => tooltip.remove());
          })
      chartContent.selectAll('.candlestick')
        .filter(d => zoom_x(d.date) < -width || zoom_x(d.date) > width)
        .dispatch('remove')
        .remove();
      candlesticks.append('rect').call(init_bar);
      candlesticks.append('line').call(init_line);
      const all_candlesticks = d3.selectAll('.candlestick')
        .call(update_candlestick)
      all_candlesticks.select('.line').call(update_line);
      all_candlesticks.select('.bar').call(update_bar);
      candlesticks.exit().dispatch('remove').remove();
      if (transform) {
        gY.call(yAxis.scale(zoom_y))
        gX.call(xAxis.scale(zoom_x));
      }
    }
    update();
    svg.call(
      d3.zoom()
        .scaleExtent([1, 40])
        .on('zoom', zoomed => update())
    );
  }

  backward() {
    this.init_data(apply_factor(this.factored_data));
  }

  forward() {
    this.init_data(apply_factor(this.factored_data, 1 / _.last(this.factored_data)['factor']));
  }

  none() {
    this.init_data(this.factored_data);
  }

  query() {
    this.loading = true;
    this.http.get(`http://localhost:5000/${this.code}/${this.startDate}/${this.endDate}`)
      .subscribe(result => {
        this.factored_data = get_factor(get_data(result), this.profit_day);
        this.init_data(this.factored_data);
        this.loading = false;
      })
  }

}
