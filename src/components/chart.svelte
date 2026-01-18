<svelte:options customElement="chart-embed-component" />

<script>
  import { onMount, onDestroy } from 'svelte';
  import FrappeChart from 'svelte-frappe-charts';

  // --- Chart Core Props ---
  export let chart_type = 'line'; // default: 'line'
  /* Examples:
      'line', 'bar', 'pie', 'scatter', 'area'
  */

  export let data_source = ''; // default empty, can be URL or JSON string
  /* Example:
      '{"labels":["Jan","Feb","Mar"],"datasets":[{"name":"Revenue","values":[1000,1500,1200]}]}'
      or 'https://api.example.com/chartdata'
  */

  export let title = 'My Chart'; // default chart title
  export let x_axis_label = 'X Axis'; // default X label
  export let y_axis_label = 'Y Axis'; // default Y label
  export let date_range = ''; 
  /* optional: "last_7_days", "last_month", "custom"
     Can be used to filter streaming data server-side
  */

  export let streaming = false; // default: no streaming
  export let refresh_interval = 5000; // default 5 seconds

  // --- Style / Branding ---
  export let colors = ['#4f46e5']; 
  /* default brand color
     Example: ["#4f46e5","#06b6d4","#f97316"]
  */

  export let background_color = '#ffffff'; // chart container background
  export let text_color = '#111827'; // chart text color
  export let width = '100%'; // default width
  export let height = '300px'; // default height
  export let show_tooltip = true; // default show tooltips
  export let show_legend = true;  // default show legend
  export let decimals = 2; // default 2 decimal places

  // --- Internal State ---
  let chartData = { labels: [], datasets: [] };
  let timer;

  // --- Fetch Data Function ---
  async function fetchData() {
    if (!data_source) return;

    try {
      let data;

      if (data_source.startsWith('http')) {
        const res = await fetch(data_source);
        data = await res.json();
      } else {
        data = JSON.parse(data_source);
      }

      // Expecting { labels: [], datasets: [{ name, values }] }
      chartData = {
        labels: data.labels || [],
        datasets: data.datasets?.map((d, i) => ({
          name: d.name,
          values: d.values,
          chartType: chart_type,
          color: colors[i % colors.length] || '#4f46e5'
        })) || []
      };
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    }
  }

  // --- Lifecycle Hooks ---
  onMount(async () => {
    await fetchData();

    if (streaming) {
      timer = setInterval(fetchData, refresh_interval);
    }
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<!-- Chart Container -->
<div class="chart-container" style="width: {width}; height: {height};">
  <FrappeChart
    {chart_type}
    {title}
    {x_axis_label}
    {y_axis_label}
    {chartData}
    colors={colors}
    background_color={background_color}
    text_color={text_color}
    show_tooltip={show_tooltip}
    show_legend={show_legend}
    decimals={decimals}
  />
</div>

<style>
  .chart-container {
    width: 100%;
    max-width: 100%;
    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
</style>

<!--
=== USAGE EXAMPLES ===

<chart-embed-component 
  chart_type="line"
  data_source='{"labels":["Jan","Feb","Mar"],"datasets":[{"name":"Revenue","values":[1000,1500,1200]}]}'
  title="Monthly Revenue"
  x_axis_label="Month"
  y_axis_label="USD"
  colors='["#4f46e5","#06b6d4","#f97316"]'
  width="600px"
  height="400px"
  streaming={true}
  refresh_interval={3000}
/>

<chart-embed-component
  chart_type="bar"
  data_source="https://api.example.com/bar-data"
  title="Sales Comparison"
  colors='["#ef4444","#10b981","#3b82f6"]'
  width="100%"
  height="350px"
/>

All props are reactive and can be updated at runtime. Streaming charts fetch new data automatically if `streaming=true`.
-->