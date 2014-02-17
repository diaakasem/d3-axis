jQuery(function($){
    // Get spreadsheet
    var data = top1ByStateData;
    var yScale, svg, xScale, xAxis, yAxis;
    var d3LineGlobal, data;
    // Get dropdown
    var $dropdown = $('.stateDropdown');
    // Set up dropdown
    var stateNames = 'United States,Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware,District of Columbia,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Ohio,Oklahoma,Oregon,Pennsylvania,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming,Northeast,South,Midwest,West';
    stateNames = stateNames.split(',');
    $dropdown.empty();
    $dropdown.append();
    $.each( stateNames, function( index, value ){
        $dropdown.append( '<option value="' + value + '">' + value + '</option>' );
    });
    // $.address.state('');
    // On address change
    $.address.change(function(event) {
        var address = event.value;
        var state = address.replace(/^\/|\/$/g, '');
        //if (state === stateNames[0]) {
            //return;
        //}
        $('.active-state span').text(state);
        updateTopOnePercentFactsheet( state );
        d3.select('.d3-line-hover').classed('d3-line-hover', false);
    });
    // On dropdown change
    $dropdown.on('change', function(event){
        var state = $(this).val();
        $.address.value(state);
    });
    // Draw graph
    top1_drawGraph();
    /**
     * Update factsheet
     */
    var $wrapper = $('.top1Wrapper');
    function updateTopOnePercentFactsheet( state ) {
        // Default to United States if there's no matching state
        if ( ! $dropdown.find('[value="'+state+'"]').length ){
             state = stateNames[0];
        }
        // Update dropdown
        $dropdown.val(state);
        // Add class to item
        $wrapper.attr({ "data-activeState": state });
        // Update graph
        top1_updateGraph( state );
    }
    /**
     * Draw line graph using D3
     */
    function top1_drawGraph() {
        var chartSelector = ".top1-chart-container";
        var $chartContainer = $(chartSelector);
        var width = $chartContainer.width();
        var height = $chartContainer.height();

        var numXTicks = Math.round( width/80 );
        var numYTicks = Math.round( height/50 ); 

        var margin = {top: 20, right: 20, bottom: 30, left: 50};
        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;
        var parseDate = d3.time.format("%d-%b-%y").parse;

        var xScale = d3.time.scale().range([0, width]);
        yScale = d3.scale.linear().range([height, 0]);

        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .ticks(numXTicks);

        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .ticks(numYTicks);

        line = d3.svg.line()
            .defined(function(d) { return d.y != null; }) // this line allows us to exclude null points from being drawn
            .x(function(d) { return xScale(d.x); })
            .y(function(d) { return yScale(d.y); });

        svg = d3.select( chartSelector ).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        var clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("id", "clip-rect")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", width)
            .attr("height", height);

        var chartBody = svg.append("g")
            .attr("clip-path", "url(#clip)");

        var rect = chartBody.append('svg:rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'white');

        function render(error, dataset) {
            // Make an array of all state names
            //
            var usaData;
            var maxY = 0;
            // Draw a line for each state
            $.each( stateNames, function ( index, stateName ) {
                // if (stateName === "United States"){
                // 	usaData = dataset
                // }
                // Loop through rows. Each row has data for a different year
                dataset.forEach(function(d, index) {
                    d.x = d3.time.format("%Y").parse(d.Date); // %d-%b-%y
                    d.y = parseFloat( d[stateName] );
                    d.y = d.y === 0 ? null : d.y;
                });
                maxY = Math.max(maxY, d3.max(dataset, function(d) { return d.y;} ));
                // The domain of the data
                xScale.domain(d3.extent(dataset, function(d) { return d.x; }));
                // yScale.domain(d3.extent(data, function(d) { return d.y; }));
                yScale.domain([
                    d3.min( dataset.concat( usaData ), function(d) { return d; }),
                    d3.max( dataset.concat( usaData ), function(d) { return d; }),
                    ]);
                yScale.domain([0, maxY]);
                var cloneDataset = [];
                for(var i=0; i<dataset.length; i++){
                    cloneDataset.push({x: dataset[i].x, y: dataset[i].y});
                }
                d3LineGlobal = typeof d3LineGlobal !== "undefined" ? d3LineGlobal : {};
                d3LineGlobal[stateName] = chartBody.append("path")
                .datum(cloneDataset)
                .attr("class", "d3-line")
                .attr("data-statename", stateName) // camel case does not work (CSS selection doesn't work correctlye/is automatically lowercased)
                .attr("d", line);
                var thisLine = d3LineGlobal[stateName];
                // d3Line.attr('stroke-width', 10);
                thisLine.on('mouseover', function(d, i){
                    var selection = d3.select(this);
                    var stateName = selection.attr('data-statename');
                    selection.classed('d3-line-hover', true);
                    $('.graph-view-other')
                    .html('View '+ stateName )
                    .off('click')
                    .on('click', function(e){
                        var selection = d3.select('.d3-line-hover');
                        $.address.value(stateName);
                        e.preventDefault();
                    });
                });
                thisLine.on('mouseout', function(d, i){
                    var selection = d3.select(this);
                    selection.classed('d3-line-hover', false);
                });
                thisLine.on('click', function(d, i){
                    var selection = d3.select(this);
                    var state = selection.attr('data-statename');
                    $.address.value(state);
                });
            });
            yScale.domain([0, maxY]);
            //yAxis.ticks(Math.ceil( height/maxY )); 
            svg.append("g")
                .attr("class", "d3-xaxis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);
            svg.append("g")
                .attr("class", "d3-yaxis")
                .call(yAxis);
        }
        // Get the data
        d3.tsv("data.tsv", render);
    }
    /**
     * Update line graph using D3
     */
    function top1_updateGraph( stateName ){
        /**
         * Update legend
         */
        var $chartContext = $(".top1-chart-container").parent();
        var $legend = $('.legend', $chartContext);
        var $usaLegendItem = $legend.find('.legend-item').not('[data-statename="United States"]');
        if ( stateName === stateNames[0] ) {
            $usaLegendItem.hide();
        } else {
            $usaLegendItem.show();
        }
        // We seem to need to wait a millisecond or else the new path selection comes up empty
        setTimeout(function(){
            /**
             * Clone a node in D3
             * @link https://groups.google.com/forum/#!topic/d3-js/-EEgqt29wmQ
             */
            function d3Clone( input ) {
                var node;
                // Check if it's a selector or a D3 object
                if ( typeof input == 'string' || input instanceof String ) {
                    node = d3.select( input ).node();
                } else {
                    node = input.node();
                }
                var clone = d3.select( node.parentNode.appendChild(node.cloneNode(true)) );
                clone.data(input.data());
                return clone;
            }
            var oldPath = d3.select('path.d3-line-active');
            var newPath = d3.select('path[data-statename="' + stateName + '"]');
            var transitionPath;
            if ( oldPath.empty() ) {
                newPath.classed('d3-line-active', true);
                top1_updateGraph( stateName );
                return;
            } else {
                transitionPath = d3Clone(oldPath).classed('d3-line-animating', true);
            }

            function updateScale() {
                var usPath = d3LineGlobal[stateNames[0]];
                var usDataset = usPath.data();
                var dataset = newPath.data();
                var yMinAndMax = d3.extent(dataset[0].concat(usDataset[0]), function(d){return d.y;});
                yScale.domain( yMinAndMax );
                $.each(d3LineGlobal, function(i, path) {
                    path
                    .datum(path.datum())
                    .transition()
                    .duration(500)
                    .ease('linear')
                    .attr("d", function(d, i) {
                        if (!d) {
                            return '';
                        }
                        var res = line(d, i);
                        return res;
                    })
                    .attr('transform', null);
                });
                svg.select('.d3-yaxis').transition().duration(500).ease('linear').call(yAxis);
            }

            transitionPath
                .transition().duration(500).ease('cubic-in-out')
                .attr("d", newPath.attr('d') )
                .each("end",function() { 
                    d3.select(this).remove();
                    d3.selectAll('.d3-line-active').classed('d3-line-active', false);
                    var clone = d3Clone(newPath);
                    d3LineGlobal[stateName] = clone;
                    newPath.remove();
                    clone.classed('d3-line-active', true);
                    updateScale();
                });

            oldPath.classed('d3-line-active', false);
        }, 10);
    }
});
