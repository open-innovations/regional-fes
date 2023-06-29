// Define a new instance of the FES
var fes

S(document).ready(function(){

	fes = new FES({
		// Some basic default options
		"options": {
			"scenario": "Leading the Way",
			"view": "NUTS",
			"key": (new Date()).getFullYear()+'',
			"parameter": "demandpk-all",
			"scale": "absolute",
			"years": {"min":2021, "max":2050},
			"map": {
				"bounds": [[49.8273,-6.4874],[59.4227,1.9336]],
				"attribution": "Vis: National Grid ESO"
			},
			"files": {
				"scenarios": "data/scenarios/index-regional-maps.json",
				"parameters": "data/scenarios/parameters-regional-maps.json"
			}
		},
		// How we map from our source data's IDs to a particular geography
		"mapping": {
			"gsp": {
				// Mapping from GSPs for the NUTS 1 layer
				"NUTSlayer": { 
					"file": "data/gridsupplypoints2nuts1.json"
				},
				// No mapping needed for GSPs
				"GSPlayer": { }
			}
		},
		// Define our layers so that they can be used in the views
		"layers": {
			"NUTSlayer":{
				"geojson": "data/maps/nuts1_BUC_4326.geojson",	// The GeoJSON file with the NUTS 1 features
				"key": "nuts118cd",	// The key used in the properties of the GeoJSON feature
				"name": "nuts118nm"
			},
			"GSPlayer":{
				"geojson":"data/maps/gridsupplypoints-unique-all-simplified.geojson",	// The GeoJSON file with the non-overlapping GSP features
				"key": "GSP"	// The key used in the properties of the GeoJSON feature
			}
		},
		// Define our map views
		"views":{
			"NUTS":{
				"title":"NUTS1 Regions",
				"source": "gsp",
				"layers":[{
					"id": "NUTSlayer",
					"heatmap": true,
					"boundary":{"strokeWidth":2}
				}],
				"popup": {
					"text": function(attr){
						var popup,title,dp,value;
						popup = '<h3>%TITLE%</h3><p style="margin-bottom: 0.25em;">%VALUE%</p>';
						// Create the panes with a unique ID for this area
						popup += '<div class="panes tabbed" id="panes-'+attr.id+'">';
						// Add first pane
						popup += '<div class="pane"><span class="tab-title">Total</span><div id="barchart-cumulative-'+attr.id+'" class="barchart"></div><p style="font-size:0.8em;margin-top: 0.25em;margin-bottom:0;text-align:center;">Time ('+this.options.years.min+'-'+this.options.years.max+')</p><p style="font-size:0.8em;margin-top:0.5em;">Totals calculated by summing the contributions from individual Grid Supply Points. Hover over each bar to see details.</p></div>';
						// Add second pane (initially hidden to make sure popup placement isn't affected)
						popup += '<div class="pane" style="display:none;"><span class="tab-title">In-year change</span><div id="barchart-actuals-'+attr.id+'" class="barchart"></div><p style="font-size:0.8em;margin-top: 0.25em;margin-bottom:0;text-align:center;">Time ('+this.options.years.min+'-'+this.options.years.max+')</p><p style="font-size:0.8em;margin-top:0.5em;">The year-to-year differences for the sums of the contributions from individual Grid Supply Points. Hover over each bar to see details.</p></div>';
						popup += '</div>';
						title = (attr.properties.nuts118nm||'?');
						value = '<strong>'+attr.parameter.title+'</strong> ';
						return popup.replace(/\%VALUE\%/g,value).replace(/\%TITLE\%/g,title); // Replace values
					},
					"open": function(attr){

						if(!attr) attr = {};
						
						l = this.views[this.options.view].layers[0].id;
						key = this.layers[l].key;

						if(attr.id){

							var panels = {'cumulative':{'data':[],'popup':[]},'actuals':{'data':[],'popup':[]}};
							var balloons = [];
							var values = this.data.scenarios[this.options.scenario].data[this.options.parameter].layers[this.options.view].values;
							var raw = this.data.scenarios[this.options.scenario].data[this.options.parameter].raw;
							
							// Work out the NUTS1 region name
							var nuts118nm = attr.id;
							if(this.layers.NUTSlayer){
								for(var c = 0; c < this.layers.NUTSlayer.geojson.features.length; c++){
									if(this.layers.NUTSlayer.geojson.features[c].properties.ctry19cd==attr.id) nuts118nm = this.layers.NUTSlayer.geojson.features[c].properties.nuts118nm;
								}
							}
						
							// Build the data and balloon arrays
							for(c in values[attr.id]){
								if(c >= this.options.years.min && c <= this.options.years.max){
									panels.cumulative.data.push([c,values[attr.id][c]]);
									panels.cumulative.popup.push({'year':c,'value':values[attr.id][c]});
									if(c > this.options.years.min){
										actual = (typeof values[attr.id][c-1]==="number" ? values[attr.id][c]-values[attr.id][c-1] : 0)
										panels.actuals.data.push([c,actual]);
										panels.actuals.popup.push({'year':(c-1)+'&rarr;'+(c),'value':actual});
									}
								}
							}

							parameter = this.parameters[this.options.parameter].title+' '+this.options.key;
							units = this.parameters[this.options.parameter].units;
							dp = this.parameters[this.options.parameter].dp;

							// Create the barchart objects. We'll add a function to
							// customise the class of the bar depending on the key.
							panels.cumulative.chart = new S.barchart('#barchart-cumulative-'+attr.id,{
								'formatKey': function(key){
									return '';
								},
								'formatBar': function(key,val,series){
									var cls = (typeof series==="number" ? "series-"+series : "");
									for(var i = 0; i < this.data.length; i++){
										if(this.data[i][0]==key){
											if(i > this.data.length/2) cls += " bar-right";
										}
									}
									return cls;
								}
							});
							// Send the data array and bin size then draw the chart
							panels.cumulative.chart.setData(panels.cumulative.data).setBins({ 'mintick': 5 }).draw();
							// Add an event
							panels.cumulative.chart.on('barover',function(e){
								S('.balloon').remove();
								var b = panels.cumulative.popup[e.bin];
								var balloon = document.createElement('div');
								balloon.classList.add('balloon');
								balloon.innerHTML = b.year+": "+parseFloat((b.value).toFixed(dp)).toLocaleString()+(units ? '&thinsp;'+units:'');
								e.event.currentTarget.querySelector('.bar.series-0').appendChild(balloon);
							});


							panels.actuals.chart = new S.barchart('#barchart-actuals-'+attr.id,{
								'formatKey': function(key){
									return '';
								},
								'formatBar': function(key,val,series){
									var cls = (typeof series==="number" ? "series-"+series : "");
									for(var i = 0; i < this.data.length; i++){
										if(this.data[i][0]==key){
											if(i > this.data.length/2) cls += " bar-right";
										}
									}
									return cls;
								}
							});
							// Send the data array and bin size then draw the chart
							panels.actuals.chart.setData(panels.actuals.data).setBins({ 'mintick': 5 }).draw();
							// Add an event
							panels.actuals.chart.on('barover',function(e){
								S('.balloon').remove();
								var b = panels.actuals.popup[e.bin];
								var balloon = document.createElement('div');
								balloon.classList.add('balloon');
								balloon.innerHTML = b.year+": "+parseFloat((b.value).toFixed(dp)).toLocaleString()+(units ? '&thinsp;'+units:'');
								e.event.currentTarget.querySelector('.bar.series-0').appendChild(balloon);
							});

							// Set some styles
							S('.barchart table .bar').css({'background-color':'#cccccc'});
							S('.barchart table .bar.series-0').css({'background-color':this.data.scenarios[this.options.scenario].color});

							// Enable tabs
							var tabbed = document.getElementById('panes-'+attr.id);
							if(tabbed) OI.TabbedInterface(tabbed).selectTab(0,true);

						}else{
							S(attr.el).find('.barchart').remove();
						}
					}
				}
			},
			"gridsupplypoints":{
				"title":"Grid Supply Points",
				"file":"data/maps/gridsupplypoints-unique-all.geojson",
				"source": "gsp",
				"layers":[{
					"id": "GSPlayer",
					"heatmap": true,
					"boundary":{"strokeWidth":0.5}
				}],
				
				"popup": {
					"text": function(attr){
						var popup,title,dp,value;
						popup = '<h3>%TITLE%</h3><p style="margin-bottom: 0.25em;">%VALUE%</p>';

						// Create the panes with a unique ID for this area
						popup += '<div class="panes tabbed" id="panes-'+safeCSS(attr.id)+'">';
						// Add first pane
						popup += '<div class="pane"><span class="tab-title">Total</span><div id="barchart-cumulative-'+safeCSS(attr.id)+'" class="barchart"></div><p style="font-size:0.8em;margin-top: 0.25em;margin-bottom:0;text-align:center;">Year ('+this.options.years.min+'-'+this.options.years.max+')</p><p style="font-size:0.8em;margin-top:0.5em;">The forecast values by year for this GSP. Hover over each bar to see details.</p></div>';
						// Add second pane (initially hidden to make sure popup placement isn't affected)
						popup += '<div class="pane" style="display:none;"><span class="tab-title">In-year change</span><div id="barchart-actuals-'+safeCSS(attr.id)+'" class="barchart"></div><p style="font-size:0.8em;margin-top: 0.25em;margin-bottom:0;text-align:center;">Year</p><p style="font-size:0.8em;margin-top:0.5em;">The year-to-year differences in forecast values for this GSP. Hover over each bar to see details.</p></div>';
						popup += '</div>';
						title = '?';
						if(attr.properties['Name']){
							title = attr.properties['Name']+' ('+attr.properties['GSP']+')';
						}else{
							if(attr.properties.GSP){
								title = attr.properties.GSP;
							}
						}
						dp = (typeof attr.parameter.dp==="number" ? attr.parameter.dp : 2);
						value = '<strong>'+attr.parameter.title+'</strong> ';
						return popup.replace(/\%VALUE\%/g,value).replace(/\%TITLE\%/g,title); // Replace values
					},
					"open": function(attr){

						if(!attr) attr = {};
						
						l = this.views[this.options.view].layers[0].id;
						key = this.layers[l].key;

						if(attr.id){

							var panels = {'cumulative':{'data':[],'popup':[]},'actuals':{'data':[],'popup':[]}};
							var balloons = [];
							var values = this.data.scenarios[this.options.scenario].data[this.options.parameter].layers[this.options.view].values;
							var raw = this.data.scenarios[this.options.scenario].data[this.options.parameter].raw;
							
							// Work out the NUTS1 region name
							var nuts118nm = attr.id;
							if(this.layers.NUTSlayer){
								for(var c = 0; c < this.layers.NUTSlayer.geojson.features.length; c++){
									if(this.layers.NUTSlayer.geojson.features[c].properties.ctry19cd==attr.id) nuts118nm = this.layers.NUTSlayer.geojson.features[c].properties.nuts118nm;
								}
							}
						
							// Build the data and balloon arrays
							for(c in values[attr.id]){
								if(c >= this.options.years.min && c <= this.options.years.max){
									panels.cumulative.data.push([c,values[attr.id][c]]);
									panels.cumulative.popup.push({'year':c,'value':values[attr.id][c]});
									if(c > this.options.years.min){
										actual = (typeof values[attr.id][c-1]==="number" ? values[attr.id][c]-values[attr.id][c-1] : 0)
										panels.actuals.data.push([c,actual]);
										panels.actuals.popup.push({'year':(c-1)+'&rarr;'+(c),'value':actual});
									}
								}
							}

							parameter = this.parameters[this.options.parameter].title+' '+this.options.key;
							units = this.parameters[this.options.parameter].units;
							dp = this.parameters[this.options.parameter].dp;

							// Create the barchart objects. We'll add a function to
							// customise the class of the bar depending on the key.
							panels.cumulative.chart = new S.barchart('#barchart-cumulative-'+safeCSS(attr.id),{
								'formatKey': function(key){
									return '';
								},
								'formatBar': function(key,val,series){
									var cls = (typeof series==="number" ? "series-"+series : "");
									for(var i = 0; i < this.data.length; i++){
										if(this.data[i][0]==key){
											if(i > this.data.length/2) cls += " bar-right";
										}
									}
									return cls;
								}
							});
							// Send the data array and bin size then draw the chart
							panels.cumulative.chart.setData(panels.cumulative.data).setBins({ 'mintick': 5 }).draw();
							// Add an event
							panels.cumulative.chart.on('barover',function(e){
								S('.balloon').remove();
								var b = panels.cumulative.popup[e.bin];
								var balloon = document.createElement('div');
								balloon.classList.add('balloon');
								balloon.innerHTML = b.year+": "+parseFloat((b.value).toFixed(dp)).toLocaleString()+(units ? '&thinsp;'+units:'');
								e.event.currentTarget.querySelector('.bar.series-0').appendChild(balloon);
							});


							panels.actuals.chart = new S.barchart('#barchart-actuals-'+safeCSS(attr.id),{
								'formatKey': function(key){
									return '';
								},
								'formatBar': function(key,val,series){
									var cls = (typeof series==="number" ? "series-"+series : "");
									for(var i = 0; i < this.data.length; i++){
										if(this.data[i][0]==key){
											if(i > this.data.length/2) cls += " bar-right";
										}
									}
									return cls;
								}
							});
							// Send the data array and bin size then draw the chart
							panels.actuals.chart.setData(panels.actuals.data).setBins({ 'mintick': 5 }).draw();
							// Add an event
							panels.actuals.chart.on('barover',function(e){
								S('.balloon').remove();
								var b = panels.actuals.popup[e.bin];
								var balloon = document.createElement('div');
								balloon.classList.add('balloon');
								balloon.innerHTML = b.year+": "+parseFloat((b.value).toFixed(dp)).toLocaleString()+(units ? '&thinsp;'+units:'');
								e.event.currentTarget.querySelector('.bar.series-0').appendChild(balloon);
							});

							// Set some styles
							S('.barchart table .bar').css({'background-color':'#cccccc'});
							S('.barchart table .bar.series-0').css({'background-color':this.data.scenarios[this.options.scenario].color});

							// Enable tabs
							var tabbed = document.getElementById('panes-'+safeCSS(attr.id));
							if(tabbed) OI.TabbedInterface(tabbed).selectTab(0,true);

						}else{
							S(attr.el).find('.barchart').remove();
						}
					}
				}
				/*"popup": {
					"text": function(attr){
						var popup,title,dp,value;
						popup = '<h3>%TITLE%</h3><p>%VALUE%</p>';
						title = '?';
						if(attr.properties['Name']){
							title = attr.properties['Name']+' ('+attr.properties['GSP']+')';
						}else{
							if(attr.properties.GSP){
								title = attr.properties.GSP;
							}
						}
						dp = (typeof attr.parameter.dp==="number" ? attr.parameter.dp : 2);
						value = '<strong>'+attr.parameter.title+' '+this.options.key+':</strong> '+(typeof attr.value==="number" ? (dp==0 ? Math.round(attr.value) : attr.value.toFixed(dp)).toLocaleString()+''+(attr.parameter.units ? '&thinsp;'+attr.parameter.units : '') : '?');
						return popup.replace(/\%VALUE\%/g,value).replace(/\%TITLE\%/g,title); // Replace values
					}
				}*/
			}
		},
		"on": {
			"buildMap": function(){
				var el,div,_obj;
				el = document.querySelector('.leaflet-top.leaflet-left');
				if(el){
					// Does the place search exist?
					if(!el.querySelector('.placesearch')){
						div = document.createElement('div');
						div.classList.add('leaflet-control');
						div.classList.add('leaflet-bar');
						div.innerHTML = '<div class="placesearch"><div class="submit" href="#" title="Search" role="button" aria-label="Search"></div><form class="placeform layersearch pop-left" action="search" method="GET" autocomplete="off"><input class="place" id="search" name="place" value="" placeholder="Search for a named area" type="text" aria-label="Search for a named area" /><div class="searchresults" id="searchresults"></div></div></form>';
						el.appendChild(div);
						
						function toggleActive(state){
							e = el.querySelector('.placesearch');
							if(typeof state!=="boolean") state = !e.classList.contains('typing');
							if(state){
								e.classList.add('typing');
								e.querySelector('input.place').focus();
							}else{
								e.classList.remove('typing');
							}
						}
					
						div.querySelector('.submit').addEventListener('click', function(e){ toggleActive(); });

						_obj = this;
						
						// Stop map dragging on the element
						el.addEventListener('mousedown', function(){ _obj.map.dragging.disable(); });
						el.addEventListener('mouseup', function(){ _obj.map.dragging.enable(); });

						// Define a function for scoring how well a string matches
						function getScore(str1,str2,v1,v2,v3){
							var r = 0;
							str1 = str1.toUpperCase();
							str2 = str2.toUpperCase();
							if(str1.indexOf(str2)==0) r += (v1||3);
							if(str1.indexOf(str2)>0) r += (v2||1);
							if(str1==str2) r += (v3||4);
							return r;
						}
						this.search = TypeAhead.init('#search',{
							'items': [],
							'render': function(d){
								// Construct the label shown in the drop down list
								return d['name']+(d['type'] ? ' ('+d['type']+')':'');
							},
							'rank': function(d,str){
								// Calculate the weight to add to this airport
								var r = 0;
								if(d['name']) r += getScore(d['name'],str);
								if(d['id']) r += getScore(d['name'],str);
								return r;
							},
							'process': function(d){
								// Format the result
								var l,ly,key,i;
								l = d['layer'];
								ly = _obj.layers[l].layer;
								key = _obj.layers[l].key;
								for(i in ly._layers){
									if(ly._layers[i].feature.properties[key]==d['id']){

										// Zoom to feature
										_obj.map.fitBounds(ly._layers[i]._bounds,{'padding':[5,5]});

										// Open the popup for this feature
										ly.getLayer(i).openPopup();
										
										// Change active state
										toggleActive(false);
									}
								}
							}
						});
					}
					if(this.search){
						var l,f,i,j;
						this.search._added = {};
						this.search.clearItems();
						//console.log(this,this.options.view,this.layers[this.options.view]);
						for(j = 0; j < this.views[this.options.view].layers.length; j++){
							l = this.views[this.options.view].layers[j].id;
							key = "";
							if(l=="NUTSlayer") key = "nuts118nm";
							else if(l=="GSPlayer") key = "GSP";
							if(this.layers[l].geojson && this.layers[l].geojson.features && this.layers[l].key && key){
								// If we haven't already processed this layer we do so now
								if(!this.search._added[l]){
									//console.log('adding',l);
									f = this.layers[l].geojson.features;
									for(i = 0; i < f.length; i++) this.search.addItems({'name':f[i].properties[key]||"?",'id':f[i].properties[this.layers[l].key]||"",'i':i,'layer':l});
									this.search._added[l] = true;
								}
							}
						}
					}
				}
			},
			"setScale": function(t){
				var abs = document.querySelectorAll("[data-scale='absolute']");
				var rel = document.querySelectorAll("[data-scale='relative']");
				console.log('setScale',abs,rel,t);
				if(abs.length > 0) abs.forEach(function(e){ e.style.display = (t=="absolute") ? '' : 'none'; });
				if(rel.length > 0) rel.forEach(function(e){ e.style.display = (t=="relative") ? '' : 'none'; });
				return this;
			}
		}
	});

	// Add download button
	if(S('#download-csv')){
		S('#download-csv').on('click',{me:fes},function(e){
			e.preventDefault();
			e.stopPropagation();
			var csv = "";
			var opt = e.data.me.options;
			var filename = ("FES-2021--{{scenario}}--{{parameter}}--{{view}}.csv").replace(/\{\{([^\}]+)\}\}/g,function(m,p1){ return (opt[p1]||"").replace(/[ ]/g,"_") });
			var values,r,rs,y,v,l,layerid;
			values = e.data.me.data.scenarios[e.data.me.options.scenario].data[e.data.me.options.parameter].layers[e.data.me.options.view].values;
			v = e.data.me.options.view;
			layerid = '';
			// We need to loop over the view's layers
			for(l = 0; l < e.data.me.views[v].layers.length; l++){
				if(e.data.me.views[v].layers[l].heatmap) layerid = l;
			}
			rs = Object.keys(values).sort();
			csv = e.data.me.views[v].title+',Name';
			for(y = e.data.me.options.years.min; y <= e.data.me.options.years.max; y++) csv += ','+y+(e.data.me.parameters[e.data.me.options.parameter] ? ' ('+e.data.me.parameters[e.data.me.options.parameter].units+')' : '');
			csv += '\n';
			for(i = 0; i < rs.length; i++){
				r = rs[i];
				csv += r;
				csv += ','+getGeoJSONPropertyValue(e.data.me.views[v].layers[layerid].id,r);
				for(y = e.data.me.options.years.min; y <= e.data.me.options.years.max; y++) csv += ','+(typeof e.data.me.parameters[e.data.me.options.parameter].dp==="number" ? values[r][y].toFixed(e.data.me.parameters[e.data.me.options.parameter].dp) : values[r][y]);
				csv += '\n'
			}
			saveToFile(csv,filename,'text/plain');
		});
	}
	function getGeoJSONPropertyValue(l,value){
		if(!fes.layers[l].key){
			fes.log('WARNING','No key set for layer '+l);
			return "";
		}
		if(fes.layers[l] && fes.layers[l].geojson){
			key = (fes.layers[l].name||fes.layers[l].key);
			for(var i = 0; i < fes.layers[l].geojson.features.length; i++){
				if(fes.layers[l].geojson.features[i].properties[fes.layers[l].key] == value) return fes.layers[l].geojson.features[i].properties[key];
			}
			return "";
		}else return "";
	};
	function saveToFile(txt,fileNameToSaveAs,mime){
		// Bail out if there is no Blob function
		if(typeof Blob!=="function") return this;

		var textFileAsBlob = new Blob([txt], {type:(mime||'text/plain')});

		function destroyClickedElement(event){ document.body.removeChild(event.target); }

		var dl = document.createElement("a");
		dl.download = fileNameToSaveAs;
		dl.innerHTML = "Download File";

		if(window.webkitURL != null){
			// Chrome allows the link to be clicked without actually adding it to the DOM.
			dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}else{
			// Firefox requires the link to be added to the DOM before it can be clicked.
			dl.href = window.URL.createObjectURL(textFileAsBlob);
			dl.onclick = destroyClickedElement;
			dl.style.display = "none";
			document.body.appendChild(dl);
		}
		dl.click();
	}
	function safeCSS(str){
		return str.replace(/[^_a-zA-Z0-9-]/g,"-");
	}

});

// Tabbed interface
(function(root){

	if(!root.OI) root.OI = {};
	if(!root.OI.ready){
		root.OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}
	function TabbedInterface(el){
		var tabs,panes,li,p,h,b,l;
		this.selectTab = function(t,focusIt){
			var tab,pane;
			tab = tabs[t].tab;
			pane = tabs[t].pane;

			// Remove existing selection and set all tabindex values to -1
			tab.parentNode.querySelectorAll('button').forEach(function(el){ el.removeAttribute('aria-selected'); el.setAttribute('tabindex',-1); });

			// Update the selected tab
			tab.setAttribute('aria-selected','true');
			tab.setAttribute('tabindex',0);
			if(focusIt) tab.focus();

			pane.closest('.panes').querySelectorAll('.pane').forEach(function(el){ el.style.display = "none"; el.setAttribute('hidden',true); });
			pane.style.display = "block";
			pane.removeAttribute('hidden');
			// Loop over any potentially visible leaflet maps that haven't been sized and set the bounds
			if(OI.maps){
				for(var m = 0; m < OI.maps.length; m++){
					if(OI.maps[m].map._container==pane.querySelector('.leaflet')){
						OI.maps[m].map.invalidateSize(true);
						if(!OI.maps[m].set){
							if(OI.maps[m].bounds) OI.maps[m].map.fitBounds(OI.maps[m].bounds);
							OI.maps[m].set = true;
						}
					}
				}
			}
			return this;
		};
		this.enableTab = function(tab,t){
			var _obj = this;

			// Set the tabindex of the tab panel
			panes[t].setAttribute('tabindex',0);

			// Add a click/focus event
			tab.addEventListener('click',function(e){ e.preventDefault(); var t = parseInt((e.target.tagName.toUpperCase()==="BUTTON" ? e.target : e.target.closest('button')).getAttribute('data-tab')); _obj.selectTab(t,true); });
			tab.addEventListener('focus',function(e){ e.preventDefault(); var t = parseInt(e.target.getAttribute('data-tab')); _obj.selectTab(t,true); });

			// Store the tab number in the tab (for use in the keydown event)
			tab.setAttribute('data-tab',t);

			// Add keyboard navigation to arrow keys following https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/Tab_Role
			tab.addEventListener('keydown',function(e){

				// Get the tab number from the attribute we set
				t = parseInt(e.target.getAttribute('data-tab'));

				if(e.keyCode === 39 || e.keyCode === 40){
					e.preventDefault();
					// Move right or down
					t++;
					if(t >= tabs.length) t = 0;
					_obj.selectTab(t,true);
				}else if(e.keyCode === 37 || e.keyCode === 38){
					e.preventDefault();
					// Move left or up
					t--;
					if(t < 0) t = tabs.length-1;
					_obj.selectTab(t,true);
				}
			});
		};
		tabs = [];

		l = document.createElement('div');
		l.classList.add('grid','tabs');
		l.setAttribute('role','tablist');
		l.setAttribute('aria-label','Visualisations');
		panes = el.querySelectorAll('.pane');
		for(p = 0; p < panes.length; p++){
			h = panes[p].querySelector('.tab-title');
			b = document.createElement('button');
			b.classList.add('tab');
			b.setAttribute('role','tab');
			if(h) b.appendChild(h);
			l.appendChild(b);
			tabs[p] = {'tab':b,'pane':panes[p]};
			this.enableTab(b,p);
		}
		el.insertAdjacentElement('beforebegin', l);
		this.selectTab(0);

		return this;
	}
	root.OI.TabbedInterface = function(el){ return new TabbedInterface(el); };

})(window || this);
