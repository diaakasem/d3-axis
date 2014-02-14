jQuery ($) ->
  
  # Get spreadsheet
  
  # Get dropdown
  
  # Set up dropdown
  
  # $.address.state('');
  # On address change
  
  # On dropdown change
  
  # Draw graph
  
  ###
  Update factsheet
  ###
  updateTopOnePercentFactsheet = (state) ->
    
    # Default to United States if there's no matching state
    state = "United States"  unless $dropdown.find("[value=\"" + state + "\"]").length
    
    # Update dropdown
    $dropdown.val state
    
    # Add class to item
    $wrapper.attr "data-activeState": state
    
    # Get state data for the selected state
    stateData = $.grep(data, (item) ->
      item.state is state
    )[0]
    
    # Update graph
    top1_updateGraph state
  
  ###
  Draw line graph using D3
  ###
  top1_drawGraph = ->
    chartSelector = ".top1-chart-container"
    $chartContainer = $(chartSelector)
    width = $chartContainer.width()
    height = $chartContainer.height()
    numXTicks = Math.round(width / 80)
    numYTicks = Math.round(height / 50)
    margin =
      top: 20
      right: 20
      bottom: 30
      left: 50

    width = width - margin.left - margin.right
    height = height - margin.top - margin.bottom
    parseDate = d3.time.format("%d-%b-%y").parse
    xScale = d3.time.scale().range([0, width])
    yScale = d3.scale.linear().range([height, 0])
    xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(numXTicks)
    yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(numYTicks)
    
    # Get the data
    d3.tsv "data.tsv", (error, dataset) ->
      # this line allows us to exclude null points from being drawn
      line = d3.svg.line().defined((d) ->
        d.y?
      ).x((d) ->
        xScale d.x
      ).y((d) ->
        yScale d.y
      )
      svg = d3.select(chartSelector).append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      
      # Make an array of all state names
      #
      stateNames = []
      $.each dataset[0], (key, value) ->
        
        # Skip the header row. There's gotta be a better way to do this, to just tell it skip the first row
        return  if key is "Date"
        stateNames.push key

      usaData = undefined
      
      # Draw a line for each state
      $.each stateNames, (index, stateName) ->
        
        # if (stateName === "United States"){
        # 	usaData = dataset
        # }
        # Loop through rows. Each row has data for a different year
        dataset.forEach (d, index) ->
          d.x = d3.time.format("%Y").parse(d.Date) # %d-%b-%y
          d.y = parseFloat(d[stateName])
          d.y = (if d.y is 0 then null else d.y)

        xScale.domain d3.extent(dataset, (d) ->
          d.x
        )
        
        # yScale.domain(d3.extent(data, function(d) { return d.y; }));
        yScale.domain [d3.min(dataset.concat(usaData), (d) ->
          d
        ), d3.max(dataset.concat(usaData), (d) ->
          d
        )]
        d3LineGlobal = (if typeof d3LineGlobal isnt "undefined" then d3LineGlobal else {})
        # camel case does not work (CSS selection doesn't work correctlye/is automatically lowercased)
        d3LineGlobal[stateName] = svg.append("path").datum(dataset).attr("class", "d3-line").attr("data-statename", stateName).attr("d", line)
        thisLine = d3LineGlobal[stateName]
        
        # d3Line.attr('stroke-width', 10);
        thisLine.on "mouseover", (d, i) ->
          selection = d3.select(this)
          stateName = selection.attr("data-statename")
          $(".graph-view-other").html("View " + stateName).off("click").on "click", (e) ->
            $.address.value stateName
            e.preventDefault()

          selection.classed "d3-line-hover", true
          selection.attr "stroke-width", 6
          selection.attr "fill", "red"

        thisLine.on "mouseout", (d, i) ->
          selection = d3.select(this)
          selection.classed "d3-line-hover", false

        thisLine.on "click", (d, i) ->
          selection = d3.select(this)
          state = selection.attr("data-statename")
          $.address.value state


      yScale.domain [0, 100]
      
      #yAxis.ticks(Math.ceil( height/maxY )); 
      svg.append("g").attr("class", "d3-xaxis").attr("transform", "translate(0," + height + ")").call xAxis
      svg.append("g").attr("class", "d3-yaxis").call yAxis

  
  ###
  Update line graph using D3
  ###
  top1_updateGraph = (stateName) ->
    
    ###
    Update legend
    ###
    $chartContext = $(".top1-chart-container").parent()
    $legend = $(".legend", $chartContext)
    $usaLegendItem = $legend.find(".legend-item").not("[data-statename=\"United States\"]")
    if stateName is "United States"
      $usaLegendItem.hide()
    else
      $usaLegendItem.show()
    
    # We seem to need to wait a millisecond or else the new path selection comes up empty
    setTimeout (->
      
      ###
      Clone a node in D3
      @link https://groups.google.com/forum/#!topic/d3-js/-EEgqt29wmQ
      ###
      d3Clone = (input) ->
        node = undefined
        
        # Check if it's a selector or a D3 object
        if typeof input is "string" or input instanceof String
          node = d3.select(input).node()
        else
          node = input.node()
        d3.select node.parentNode.appendChild(node.cloneNode(true))
      oldPath = d3.select(".d3-line-active")
      newPath = d3.select("[data-statename=\"" + stateName + "\"]")
      transitionPath = undefined
      if oldPath.empty()
        newPath.classed "d3-line-active", true
        return
      else
        transitionPath = d3Clone(oldPath).classed("d3-line-animating", true)
      transitionPath.transition().duration(500).ease("cubic-in-out").attr("d", newPath.attr("d")).each "end", ->
        d3.select(this).remove()
        d3.selectAll(".d3-line-active").classed "d3-line-active", false
        clone = d3Clone(newPath)
        newPath.remove()
        clone.classed "d3-line-active", true
        dataset = newPath.data()
        newPath.remove()
        clone.classed "d3-line-active", true
        maxY = _.max(_.pluck(dataset[0], "y")) or 0
        minY = _.min(_.pluck(dataset[0], "y")) or 0
        yScale.domain [minY, maxY]
        yAxis.scale yScale
        svg.select(".d3-yaxis").call yAxis

      oldPath.classed "d3-line-active", false
    ), 1
  data = top1ByStateData
  xAxis = undefined
  yAxis = undefined
  xScale = undefined
  yScale = undefined
  svg = undefined
  $dropdown = $(".stateDropdown")
  stateNames = "United States,Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware,District of Columbia,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Ohio,Oklahoma,Oregon,Pennsylvania,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming,Northeast,South,Midwest,West"
  stateNames = stateNames.split(",")
  $dropdown.empty()
  $dropdown.append()
  $.each stateNames, (index, value) ->
    $dropdown.append "<option value=\"" + value + "\">" + value + "</option>"

  $.address.change (event) ->
    address = event.value
    state = address.replace(/^\/|\/$/g, "")
    updateTopOnePercentFactsheet state

  $dropdown.on "change", (event) ->
    state = $(this).val()
    $.address.value state

  top1_drawGraph()
  $wrapper = $(".top1Wrapper")

