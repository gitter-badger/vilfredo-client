/****************************************************************************
#
# This file is part of the Vilfredo Client.
#
# Copyright © 2009-2014 Pietro Speroni di Fenizio / Derek Paterson.
#
# VilfredoReloadedCore is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation version 3 of the License.
#
# VilfredoReloadedCore is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
# FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
# for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with VilfredoReloadedCore.  If not, see <http://www.gnu.org/licenses/>.
#
****************************************************************************/
var question_id = getQuerySegment('question');
if (!question_id) { 
    question_id = getQuerySegment('domination');
}
console.log(question_id);

var generation_id = parseInt(getQuerySegment('gen'));

var room = getQuerySegment('room');
console.log(room);

//var room = $.url().param('room') ? $.url().param('room') : '';
//var room = getQuerySegment('room');

var DEFAULT_MAP_TYPE = 'all';

var currentUserViewModel;
var proposalsViewModel;
var questionViewModel;
var viewProposalViewModel;
var loginViewModel;
var addProposalViewModel;
var newQuestionViewModel;
var svggraph;
var userid = false;
var votesgraph;
var pfvotesgraph;
var triangle;
var permissionsViewModel;

var triangle_offset_x = 0;
var triangle_offset_y = 0;
var voting_triangle_width;
var voting_triangle_height;

function getKeys(object)
{
    //return ["5", "6", "7", "8"];
    var keys = [];
    map = object;
    if (map === undefined) return;
    $.each(map, function( index, value ) {
        keys.push(index);
    });
    return keys;
}

function arrayDiff(arr1, arr2)
{
    diff = [];
    jQuery.grep(arr2, function(el) {
        if (jQuery.inArray(el, arr1) == -1) 
        {
            diff.push(el);
        }
    });
    return diff;
}

function getQuerySegment(variable)
{
    //var params = $.url('0.0.0.0:8080/room/vilfredo/question/2').segment();
	var params = $.url().segment();
	var match = params.indexOf(variable);
	//console.log('getQueryVariable: match index = ' + match);
	if (match > -1 && typeof params[match+1] != "undefined")
	{
		return params[match+1]
	}
	else
	{
		return false;
	}
}
function getQueryVariable(variable)
{
    //var params = $.url('0.0.0.0:8080/room/vilfredo/question/2').segment();
	return $.url().param(variable);
}


function plotThresholdEndpoint(Ax, Ay, Bx, By, Ty) {
    return (Ty - (Ay - (Ax * (By - Ay) ) / (Bx - Ax))) / ((By - Ay) / (Bx - Ax));
}

function getNumericStyleProperty(style, prop){
    return parseInt(style.getPropertyValue(prop),10) ;
}

function element_position(e) {
    var x = 0, y = 0;
    var inner = true ;
    do {
        x += e.offsetLeft;
        y += e.offsetTop;
        var style = getComputedStyle(e,null) ;
        var borderTop = getNumericStyleProperty(style,"border-top-width") ;
        var borderLeft = getNumericStyleProperty(style,"border-left-width") ;
        y += borderTop ;
        x += borderLeft ;
        if (inner){
          var paddingTop = getNumericStyleProperty(style,"padding-top") ;
          var paddingLeft = getNumericStyleProperty(style,"padding-left") ;
          y += paddingTop ;
          x += paddingLeft ;
        }
        inner = false ;
    } while (e = e.offsetParent);
    return { x: x, y: y };
}

// Get point in global SVG space
function cursorPoint(svg, evt){
  var pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function initCVTriangle_v2(svg)
{
	$('#votenowwindow .showtriangle .votenow').on( "click", function(e) {
    	var loc = cursorPoint(svg, e);
        console.log(loc.x + ' , ' + loc.y);
    	//svg = $('#votenowwindow .showtriangle').svg('get');
    	//svg.circle(currentx, currenty, 12, {class: 'vote', fill: 'white', stroke: 'white', strokeWidth: 2, cursor:     'pointer'});
	});
}


function drawTriangle2(svg, width, height)
{
	var path = svg.createPath();
    var triangle = svg.path(
        path.move( 100, 0)
        .line( -100, 200, true )
        .line( 200, 0, true )
        .close(),
        {
            fill: 'blue', 
            stroke: 'white', 
            strokeWidth: 2
        }
    );
}

function initCVTriangleLarge_v2(svg)
{
    var c = document.getElementsByClassName('pointer');
    var cx = c.cx.baseVal;
    var cy = c.cy.baseVal;
    var svg = this;
    var point = svg.createSVGPoint();
    svg.onmousemove = function(e){
        point.x = e.clientX;
        point.y = e.clientY;
        var ctm = c.getScreenCTM();
        var inverse = ctm.inverse();
        var p = point.matrixTransform(inverse);
        cx.value = p.x;
        cy.value = p.y;
    };
}



function resetSize(svg, width, height) 
{
	svg.configure({width: width, height: height}, true);
}

function setMapColor(nx, ny) // whale
{
    var col_max = 255;
    var G = Math.round(col_max * nx);
    var R = Math.round(col_max - G);
    var B = Math.round(col_max * ny);
    return "rgb(" + R + "," + G + "," + B + ")";
}

// Add current votes to votemap
function setVote(proposal) // eel
{
    console.log('setVote called...');
	var votemap = $('#modalvotesmap');
	var svg = $(votemap).svg('get');
	
	max_x = $(svg._container).innerWidth();
	console.log('container_width = ' + max_x);
    max_y = 0.7 * max_x;
    console.log('container_height = ' + max_y);

	cx = max_x * proposal.mapx;
	cy = max_y * proposal.mapy;
	
	var votesgroup = $('.votes', svg.root());
    var radius = 10;
	
	// If a vote is already plotted, remove it
	var vote = $('.vote', svg.root()).filter(function() {
		return $(this).data("pid") == proposal.id();
	});
	if (vote)
	{
		$(vote).remove();
	}
	
	// Set color based on endorse_type
	/*
	switch(proposal.endorse_type())
    {
    case 'endorse':
        fill_color = 'green';
        break;
    case 'oppose':
        fill_color = 'red';
        break;
    case 'confused':
        fill_color = 'blue';
        break;
    default:
        fill_color = 'yellow';
    }*/
    
    //console.log("setMapColor ==========> " + setMapColor(proposal.mapx, proposal.mapy));
    
    // whale
    fill_color = setMapColor(proposal.mapx, proposal.mapy);
    
    //fill_color = "rgb(164, 91, 121)";
	
	// Plot vote on votemap
	vote = svg.circle(votesgroup, cx, cy, radius+1, {class: 'vote', fill: fill_color, cursor: 'pointer'});
    $(vote).data('pid', proposal.id());
    $(vote).on( "mouseenter", function(e) {
        //console.log("Proposal " + $(this).data('pid'));
        console.log("Proposal cx " + $(this).attr('cx') + ", cy " + $(this).attr('cy'));
        //$('#votemap-thisprop').html($(this).data('pid'));
    });
}

function voteHandler(e)
{
    console.log('vote recorded by voteHandler function...');
	var posX = $('#map').offset().left;
	var cx = e.pageX - posX - radius;
    var posY = $(triangle).offset().top;
    var cy = e.pageY - posY - radius;
	//svg.circle(g, cx, cy, radius+1, {class: 'vote', fill: 'yellow', cursor: 'pointer'});
	// Endorse with normalised vote coordinates
	var n_cx = cx / max_x;
	var n_cy = cy / max_y;
	console.log("Vote to be added at " + cx + ", " + cy);
	//proposalsViewModel.mapEndorseWithIndex(n_cx, n_cy, voteMapViewModel.proposal_index);
}


function showUserVotes(clicked, svg, userid, threshold)
{
    $('#allvotes').remove();
    
    var g = svg.group(resultsmap, 'alluservotes');
    var radius = 10;
    var fill_color;
    
    var votex = parseInt($(clicked).attr('cx'));
    var votey = parseInt($(clicked).attr('cy'));
    
    // Display username
    var txtx, texty;
    if (votex < 30)
    {
        txtx = votex + 25;
    }
    else
    {
        txtx = votex - 20;
    }
    if (votey < 30)
    {
        txty = votey + 25;
    }
    else
    {
        txty = votey - 20;
    }
    //svg.text(g, txtx, txty, coords.voters[parseInt(userid)].username);
    var username = questionViewModel.results[parseInt($(med).data('pid'))].voters[parseInt(userid)].username; 
    var label = "All " + username + "'s votes";
    svg.text(g, txtx, txty, label);
    
    var med_selected_fill_color = '#7e7e7e';
    
    var container_width = $(svg._container).innerWidth();
    var container_height = 0.7 * container_width;

    jQuery.each(questionViewModel.results, function(pid, coords) {
        medx = container_width * coords['median']['medx'];
        medy = container_height * coords['median']['medy'];
        
        cx = container_width * coords['voters'][parseInt(userid)]['mapx'];
        cy = container_height * coords['voters'][parseInt(userid)]['mapy'];
        
        // whale
        fill_color = setMapColor(coords['voters'][parseInt(userid)]['mapx'], coords['voters'][parseInt(userid)]['mapy']);
        
        // Set fill colour
        /*
        if (cy > threshold.mapy)
        {
            fill_color = 'blue';
        }
        else if (cx < threshold.mapx)
        {
            fill_color = 'red';
        }
        else
        {
            fill_color = 'green';
        }
        */
        
        // Draw line to connect vote with median
        svg.line(g, cx, cy, medx, medy, {strokeWidth: 1, stroke: fill_color});
        
        vote = svg.circle(g, cx, cy, radius+1, {class: 'alluservotes', fill: fill_color, cursor: 'pointer', title: 'User ' + userid});
        $(vote).data('userid', userid);
        $(vote).data('pid', pid);
        
        $(vote).on( "click", function(e) {
            var pid = parseInt($(this).data('pid'));           
            var med = $('.med').filter(function() {
                return parseInt($(this).data('pid')) === pid;
            });

            if (med)
            {
                showProposalVotes(med, svg, threshold, coords['voters']);
            }
        });
        
        var med = svg.circle(g, medx, medy, radius+1, {fill: med_selected_fill_color, cursor: 'pointer', title: 'User ' + userid})
        $(med).on( "click", function(e) {
            showProposalVotes(this, svg, threshold, coords['voters']);
        });
        
        /*
        var votex = parseInt($(vote).attr('cx'));
        var votey = parseInt($(vote).attr('cy'));
        
        // Display username
        var txtx, texty;
        if (votex < 30)
        {
            txtx = votex + 25;
        }
        else
        {
            txtx = votex - 20;
        }
        if (votey < 30)
        {
            txty = votey + 25;
        }
        else
        {
            txty = votey - 20;
        }
        svg.text(g, txtx, txty, coords.voters[parseInt(userid)].username); 
        */
    });
}

function showProposalVotes(med, svg, threshold, voters)
{    
    var container_width = $(svg._container).innerWidth();
    var container_height = 0.7 * container_width;
    
    $('#allvotes,#alluservotes').remove();
    
    //threshold = {'mapx': container_width * questionViewModel.mapx, 'mapy': container_height * questionViewModel.mapy}
    console.log("Threshold at (" + threshold.mapx + ", " + threshold.mapy +")");
    
    var g = svg.group(resultsmap, 'allvotes');
    var radius = 10;
    var fill_color;
    
    var med_selected_fill_color = '#7e7e7e';
        
    //svg.circle(g, threshold.mapx, threshold.mapx, radius+1, {fill: 'yellow', title: 'THRESHOLD ' + threshold.mapx + ', ' +  threshold.mapy});
    
    jQuery.each(voters, function(userid, coords) {
        cx = container_width * coords.mapx;
        cy = container_height * coords.mapy;
        //console.log("Draw " + coords.username + "'s vote at (" + cx + ", " + cy +")");
        
        /*
        // Set fill colour
        if (cy > threshold.mapy)
        {
            //console.log(cy + ' > ' + threshold.mapy + ' == True');
            //console.log('Set to blue');
            fill_color = 'blue';
        }
        else if (cx < threshold.mapx)
        {
            //console.log(cy + ' > ' + threshold.mapy + ' == False AND ' + cx + ' < ' + threshold.mapx);
            //console.log('Set to red');
            fill_color = 'red';
        }
        else
        {
            //console.log('Else set to green');
            fill_color = 'green';
        }
        */
        
        // whale
        fill_color = setMapColor(coords.mapx, coords.mapy);
        
        // Draw line to connect vote with median
        svg.line(g, cx, cy, parseInt($(med).attr('cx')), parseInt($(med).attr('cy')), {strokeWidth: 1, stroke: fill_color});
        
        vote = svg.circle(g, cx, cy, radius+1, {class: 'allvotes', fill: fill_color, cursor: 'pointer', title: 'User ' + userid});
        $(vote).data('userid', userid);
        $(vote).data('pid', $(med).attr('pid'));
        
        $(vote).on( "click", function(e) {
            console.log('click on user vote...');
            showUserVotes(this, svg, userid, threshold);
        });
        
        
        // Display username
        var txtx, texty;
        if (cx < 30)
        {
            txtx = cx + 25;
        }
        else
        {
            txtx = cx - 20;
        }
        if (cy < 30)
        {
            txty = cy + 25;
        }
        else
        {
            txty = cy - 20;
        }
        svg.text(g, txtx, txty, coords.username); 
    });
    svg.circle(g, parseInt($(med).attr('cx')), parseInt($(med).attr('cy')), radius+1, {class: 'allvotes', fill: med_selected_fill_color, cursor: 'pointer', title: 'User ' + userid});
}

// jazz
function redoResultsMap()
{
    console.log('redoResultsMap called...');
    $.when(questionViewModel.fetchVotingResults()).done(function()
    {
	    //var results = $('#resultstriangle');
	    $('#resultsmap').remove();
	    svg = $('#resultstriangle').svg('get');
        createResultsMap(svg);
    });
} 


function createResultsMap(svg) // jazz
{
	console.log('createResultsMap called...');
	var container_width = $(svg._container).innerWidth();
	console.log('container_width = ' + container_width);
    var container_height = 0.7 * container_width;
    console.log('container_height = ' + container_height);
    
    var max_x = container_width;
    var max_y = container_height;
    var mid_x = container_width/2;
    var mid_y = container_height/2;
    
    var resultsmap = svg.group('resultsmap');
    
    resetSize(svg, container_width, container_height); 
    
	var path = svg.createPath();
    var triangle = svg.path(resultsmap,
        path.move(0, 0)
        .line( container_width/2, container_height, true )
        .line( container_width/2, -container_height, true )
        .close(),
        {
            fill: 'white',
            stroke: '#CDCDCD',
            strokeWidth: 2,
            id: 'map'
        }
    );

    
    var threshold_x = container_width*questionViewModel.mapx;
    var threshold_y = container_height*questionViewModel.mapy;
    // Add current threshold point - debugging
    var threshold = {'mapx': threshold_x, 'mapy': threshold_y};
    
    /*
    // Add threshold marker
    var marker_top = svg.line(resultsmap, threshold_x, 0, threshold_x, threshold_y, {id: 'marker_top', strokeWidth: 2, stroke: 'black'});
    
    var Lx = plotThresholdEndpoint(0, 0, mid_x, max_y, threshold_y);
    //console.log("Left point at " + Lx + ", " + threshold_y);
    
    var Rx = plotThresholdEndpoint(max_x, 0, mid_x, max_y, threshold_y);
    //console.log("Right point at " + Rx + ", " + threshold_y);
    // #CDCDCD
    var marker_left = svg.line(resultsmap, Lx, threshold_y, Rx, threshold_y, {id: 'marker_top', strokeWidth: 2, stroke: 'black'});
    */

    var g = svg.group(resultsmap, 'votes');
    var radius = 10;
    
    jQuery.each(questionViewModel.results, function(pid, coords) {
        if (!coords['median'])
        {
            return;
        }
        
        cx = container_width * coords['median'].medx;
        cy = container_height * coords['median'].medy;
        
        //console.log("Draw result vote at (" + cx + ", " + cy +")");
        
        fill_color = '#BEBEBE';
        
        med_fill = '#BEBEBE';
        med_selected_fill_color = '#7e7e7e';
        
        // var title ='Proposal ' + pid;
        var title; 
        var prop = proposalsViewModel.getProposal(pid);
        
        //title = 'Coords (' + cx + ', ' + cy + ')';
        
        if (prop)
        {
             title = prop.title();
        }
        else
        {
            title = 'Proposal ID ' + pid
        }
        
        med = svg.circle(g, cx, cy, radius+1, {class: 'med', fill: med_fill, cursor: 'pointer', title: title});
        $(med).data('pid', pid);
        
        // Display proposal ID
        var txtx, texty;
        txtx = cx;
        if (cy < 30)
        {
            txty = cy + 25;
        }
        else
        {
            txty = cy - 20;
        }
        svg.text(g, txtx, txty, pid); 

        $(med).on( "click", function(e) {
            //console.log('click on median...');
            showProposalVotes(this, svg, threshold, coords['voters']);
        });
        
        // Add error triangle if defined
        if (false && coords['e_error'])
        {
            // console.log('Adding error triangle for proposal ' + pid);
            var e_error_cx = container_width * coords['e_error']['mapx'];
            var e_error_cy = container_height * coords['e_error']['mapy'];
            var o_error_cx = container_width * coords['o_error']['mapx'];
            var o_error_cy = container_height * coords['o_error']['mapy'];
            var c_error_cx = container_width * coords['c_error']['mapx'];
            var c_error_cy = container_height * coords['c_error']['mapy'];
            
            var path = svg.createPath();
            svg.path(
                path.move(e_error_cx, e_error_cy)
                .line( o_error_cx, o_error_cy )
                .line( c_error_cx, c_error_cy )
                .close(),
                {fill: 'none', stroke: '#CDCDCD', strokeWidth: 1}
            ); 
        }
    });
}

function createVoteMap(svg) // eel
{
	//alert('createVoteMap called');
	
	console.log('createVotesMap called...');
	
	var container_width = $(svg._container).innerWidth();
	console.log('container_width = ' + container_width);
    var container_height = 0.7 * container_width;
    console.log('container_height = ' + container_height);
    
    var max_x = container_width;
    var max_y = container_height;
    var mid_x = container_width/2;
    var mid_y = container_height/2;
    
    resetSize(svg, container_width, container_height); 
    
    var triangle_width = container_width - triangle_offset_x;
    var triangle_height = container_height - triangle_offset_y;
    voting_triangle_width = triangle_width;
    voting_triangle_height = triangle_height;
    //var triangle_translation = 'translate(' + triangle_offset_x  + ',' + triangle_offset_y + ')'
    var tg = svg.group();
    
	var path = svg.createPath();
    var triangle = svg.path(
        tg,
        path.move(0, 0)
        .line( triangle_width/2, triangle_height, true )
        .line( triangle_width/2, -triangle_height, true )
        .close(),
        {
            fill: 'white',
            stroke: '#CDCDCD',
            strokeWidth: 2,
            id: 'map'
        }
    );
    
    /*
    svg.mask(parent, id, x, y, width, height, settings) 
    
    svg.linearGradient(parent, id, stops, x1, y1, x2, y2, settings) 
    svg.radialGradient(parent, id, stops, cx, cy, r, fx, fy, settings) 
    //svg.radialGradient(defs, 'supportGradient', [['0%', 'red'], ['50%', 'blue'], ['100%', 'red']], 200, 100, 150, 200, 100); 
    */
    /*
    
     [0.5, 'white', 0.1],
    
    var guide_group = svg.group();
    var defs = svg.defs(guide_group); 
    svg.linearGradient(defs, 'supportGradient', [['0%', 'red'], ['100%', 'green']], max_x-110, max_y-230, 30, 100); 
    */
    
    var defs = svg.defs(); 
    svg.linearGradient(defs, 'blur', [[0, 'white']], 0, 0, 10, 0, {gradientUnits: 'userSpaceOnUse'});
    svg.linearGradient(defs, 'support_gradient', [[0, 'red'], [1, 'orange']], 0, 0, 1, 0, {gradientUnits: 'userSpaceOnUse'});
    svg.linearGradient(defs, 'oagradient', [[0, 'red'], [1, 'green']], 0, 0, 230, 0, {gradientUnits: 'userSpaceOnUse'});
    
    //  [0.5, 'grey', 0.5],
    
    //var agree_oppose = svg.rect(20, max_y-75, 250, 30, 5, 5, {fill: 'url(#oagradient)', stroke: 'grey', strokeWidth: 3});
    
    //svg.linearGradient(defs, 'support_gradient_2', [[0.5, 'grey', 0.5]], 0, 0, max_x, 0, {gradientUnits: 'userSpaceOnUse'}); 
    
    var agree_oppose = svg.rect(20, max_y-75, 250, 30, 5, 5, {fill: 'green', stroke: 'grey', strokeWidth: 3});
    var agree_oppose_fill = svg.rect(20, max_y-75, 125, 30, {id: 'haobox', fill: 'red', stroke: 'none'});
    
    /*
    var vunderstand = svg.rect(max_x-110, max_y-230, 30, 200, 5, 5, {fill: 'blue', stroke: 'grey', strokeWidth: 3});
    var vunderstand_fill = svg.rect(max_x-110, max_y-230, 30, 100, {id: 'vubox', fill: 'yellow', stroke: 'none'});
    */
    
    var vunderstand = svg.rect(max_x-110, max_y-230, 30, 200, 5, 5, {fill: 'yellow', stroke: 'grey', stroke: 'none'});
    var vunderstand_fill = svg.rect(max_x-110, max_y-230, 30, 100, {id: 'vubox', fill: '#cdcdcd', stroke: 'none'});
    
    svg.text(15, max_y-85, 'Oppose', {id: 'uboxtext', fill: 'red', strokeWidth: 2, fontSize: '20', fontFamily: 'Verdana',});
    svg.text(210, max_y-85, 'Agree', {id: 'aboxtext', fill: 'green', strokeWidth: 2, fontSize: '20', fontFamily: 'Verdana',});
    svg.text(max_x-165, max_y-240, 'Understand', {id: 'aboxtext', fill: 'yellow', strokeWidth: 2, fontSize: '20', fontFamily: 'Verdana'});
    
    
    // Add  mask 
    /*
    var defs = svg.defs();
    var mask = svg.mask(defs, 'agree_oppose_mask', 0, max_y - triangle_offset_y, triangle_width/2, triangle_offset_y, {maskUnits: 'userSpaceOnUse'}); 
    svg.rect(mask, 0, max_y - triangle_offset_y, triangle_width, triangle_offset_y, {id: 'footer_haobox_mask', fill: 'white'}); 
    //
    */
    
    // testing
    // var test_mask = svg.mask(defs, 'Mask', 0, 0, 100, 20, {maskUnits: 'userSpaceOnUse'}); 
    // svg.rect(test_mask, 0, 0, 300, 20, {fill: 'orange'});
    //
    
    var opp_agg_group = svg.group({ mask: 'url(#agree_oppose_mask)' });
    
    var agree_oppose = svg.rect(opp_agg_group, 0, max_y - triangle_offset_y, triangle_width, triangle_offset_y, {fill: 'green', stroke: 'none', strokeWidth: 3});
    var agree_oppose_fill = svg.rect(opp_agg_group, 0, max_y - triangle_offset_y, triangle_width/2, triangle_offset_y, {id: 'footer_haobox', fill: 'red', stroke: 'none'});
    
    
    var vunderstand = svg.rect(max_x - triangle_offset_x, 0, triangle_offset_x, triangle_height, {fill: 'yellow', stroke: 'none'});
    var vunderstand_fill = svg.rect(max_x - triangle_offset_x, 0, triangle_offset_x, triangle_height/2, {id: 'side_vubox', fill: '#cdcdcd', stroke: 'none'});
    
    
    var g = svg.group(tg, 'votes');
    var radius = 10;
    
    var threshold_x = container_width*questionViewModel.mapx;
    var threshold_y = container_height*questionViewModel.mapy;

    // Add current votes to votemap
    ko.utils.arrayForEach(proposalsViewModel.proposals(), function(proposal) {
            
        if (!proposal.mapx || !proposal.mapy)
        {
            console.log('no map coords');
            return;
        }
        
        cx = triangle_width * proposal.mapx;
        cy = triangle_height * proposal.mapy;
        console.log("Draw vote at (" + cx + ", " + cy +")");
        
        if (proposal.id() == voteMapViewModel.proposal_id()) // whale
        {            
            fill_color = setMapColor(proposal.mapx, proposal.mapy);
        }
        else
        {
            fill_color = '#BEBEBE';
        }
        
        vote = svg.circle(g, cx, cy, radius+1, {class: 'vote', fill: fill_color, cursor: 'pointer'});
        $(vote).data('pid', proposal.id());
        
        
        // Display proposal ID
        /*
        var txtx, texty;
        txtx = cx;
        if (cy < 30)
        {
            txty = cy + 25;
        }
        else
        {
            txty = cy - 20;
        }
        svg.text(g, txtx, txty, String(proposal.id())); 
        */
        
        $(vote).on( "click", function(e) {
            console.log('click on vote');
            $(this).parent().siblings('#map').trigger(e);
        });
        $(vote).on( "mousemove", function(e) {
            $(this).parent().siblings('#map').trigger(e);
        });
    });
    
     // eel
     // Set helpers through mose movements
     $(triangle).on( "mousemove", function(e) {
    	var posX = $(this).offset().left;
    	var posY = $(this).offset().top;
    	    	
    	var cx, cy;
    	if (typeof $.browser.webkit == 'undefined')
    	{
    	    cx = e.pageX - posX - radius;
    	    cy = e.pageY - posY - radius;
    	}
    	else
    	{
    	    cx = e.pageX - posX;
    	    cy = e.pageY - posY;
    	}
    	
    	var max_x = $(svg._container).innerWidth();
    	var max_y = $(svg._container).innerHeight();
        
        var norm_cx = cx / (max_x - triangle_offset_x);
    	var norm_cy = cy / (max_y - triangle_offset_y);
    	
    	var horizontal_width = voting_triangle_width;
    	var vertical_height = voting_triangle_height;

    	var oppose_val = (1 - norm_cx) * horizontal_width;
    	var vunderstand_val = norm_cy * vertical_height;
    	
    	//$('#footer_haobox').attr('width', oppose_val);
    	$('#side_vubox').attr('height', vunderstand_val);
    	
    	var oppose_mask_val = (norm_cx * horizontal_width)/2;
    	$('#footer_haobox_mask').attr('x', oppose_mask_val);
    });
     // Set helpers through mose movements
    $(triangle).on( "mousemove", function(e) {
    	var posX = $(this).offset().left;
    	var posY = $(this).offset().top;
    	
    	var cx, cy;
    	if (typeof $.browser.webkit == 'undefined')
    	{
    	    cx = e.pageX - posX - radius;
    	    cy = e.pageY - posY - radius;
    	}
    	else
    	{
    	    cx = e.pageX - posX;
    	    cy = e.pageY - posY;
    	}
    	
    	var max_x = $(svg._container).innerWidth();
    	var max_y = $(svg._container).innerHeight();
        
        var norm_cx = cx / max_x;
    	var norm_cy = cy / max_y;
    	
    	var horizontal_width = 250;
    	var vertical_height = 200;

    	var agree_val = norm_cx * horizontal_width;
    	var oppose_val = (1 - norm_cx) * horizontal_width;
    	var understand_val = (1 - norm_cy) * horizontal_width;
    	var vunderstand_val = norm_cy * vertical_height;
    	
    	$('#haobox').attr('width', oppose_val);
    	$('#vubox').attr('height', vunderstand_val);
    });
    
    /*
    Record vote on votemap
    */
    $(triangle).on( "click", function(e) {
        
        console.log('Voting triangle clicked!!!!! Recording vote...');
    	var posX = $(this).offset().left;
    	var posY = $(this).offset().top;
        //console.log("posX, posY = (" + posX + ", " + posY + ")");
    	
    	var cx, cy;
    	if (typeof $.browser.webkit == 'undefined')
    	{
    	    cx = e.pageX - posX - radius;
    	    cy = e.pageY - posY - radius;
    	}
    	else
    	{
    	    cx = e.pageX - posX;
    	    cy = e.pageY - posY;
    	}
    	
    	// Endorse with normalised vote coordinates
    	var n_cx = cx / max_x;
    	var n_cy = cy / max_y;
    	    	
    	proposalsViewModel.mapEndorseWithIndex(n_cx, n_cy, voteMapViewModel.proposal_index());
	}); // eel
}


function initCVTriangleLarge(jqsvg)
{
	width = $(jqsvg._container).innerWidth();
    height = $(jqsvg._container).innerHeight();
    //svg.configure({width: width, height: height}, true);
    panelwidth = $('#cvtriangle').innerWidth();
    panelheight = $('#cvtriangle').innerHeight();
	//svg.configure({width: panelwidth, height: panelheight}, true);

	//jqsvg = $('#cvtriangle').svg('get');
	var votemap = $('.votemap', jqsvg.root()).get(0); //jazz
	var pointer = $('.pointer', jqsvg.root()).get(0);

	$(pointer).on( "click", function(e) {
    	console.log('mouse click...');
    	//return;
    	//jqsvg = $('#cvtriangle').svg('get');
    	//svg = document.querySelector("svg");
    	svg = document.getElementsByTagName("svg")[1];
    	var pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        pt = pt.matrixTransform(svg.getScreenCTM().inverse());
        console.log('Draw point at pt.x ' + pt.x + ' , pt.y ' + pt.y);
        // Add vote to votes group
        var votes = $('.votes', jqsvg.root()).get(0);
    	jqsvg.circle(pt.x, pt.y, 5, {class: 'vote', fill: 'yellow', stroke: 'white', strokeWidth: 0, cursor: 'pointer'});
	});
	
	/*
	$(votemap).on( "mouseout", function(e) {
    	console.log('mouse out...');
    	return;
    	var jqsvg = $('#cvtriangle').svg('get');
    	var pointer = $('.pointer', jqsvg.root()).remove();
	});*/
	
	$(votemap).on( "mousemove", function(e) {
    	console.log('mouse move...');
    	//svg = document.querySelector("svg");
    	svg = document.getElementsByTagName("svg")[1];
    	var pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        pt = pt.matrixTransform(svg.getScreenCTM().inverse());
        console.log('Move point to pt.x ' + pt.x + ' , pt.y ' + pt.y);
    	
    	var pointer = $('.pointer', jqsvg.root()).get(0);
    	$(pointer).attr('fill', 'white');
	    var cx = pointer.cx.baseVal;
        var cy = pointer.cy.baseVal;
	    cx.value = Math.round(pt.x);
        cy.value = Math.round(pt.y);
	});
	$(pointer).on( "mousemove", function(e) {
    	console.log('mouse move...');
    	//svg = document.querySelector("svg");
    	svg = document.getElementsByTagName("svg")[1];
    	var pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        pt = pt.matrixTransform(svg.getScreenCTM().inverse());
        console.log('Move point to pt.x ' + pt.x + ' , pt.y ' + pt.y);
    	
    	var pointer = $('.pointer', jqsvg.root()).get(0);
    	$(pointer).attr('fill', 'white');
    	    var cx = pointer.cx.baseVal;
            var cy = pointer.cy.baseVal;
    	    cx.value = pt.x;
            cy.value = pt.y;
	});
}

function initCVTriangle(svg)
{
	$('#votenowwindow .showtriangle .votenow').on( "click", function(e) {
    	
    	var posX = $(this).offset().left;
        var posY = $(this).offset().top;
        
        console.log('posX ' + posX + ' , ' + 'posY ' + posY);
        console.log('e.pageX ' + e.pageX + ' , ' + 'e.pageY ' + e.pageY);
        
        panelwidth = $('.showtriangle').innerWidth();
        panelheight = $('.showtriangle').innerHeight();
        
        console.log('panelwidth ' + panelwidth + ' , ' + 'panelheight ' + panelheight);
        
    	console.log((e.pageX - posX) + ' , ' + (e.pageY - posY));
    	currentx = (e.pageX - posX);
        currenty = (e.pageY - posY);
        console.log(currentx + ' , ' + currenty);
    	svg = $('#votenowwindow .showtriangle').svg('get');
    	svg.circle(currentx, currenty, 5, {class: 'vote', fill: 'white', stroke: 'white', strokeWidth: 2, cursor: 'pointer'});

	});
}

showCVTriangle = function()
{
	$('#votenowwindow').modal('show');
	//$('.showtriangle').svg({onLoad: drawVotingTriangle});
	$('#votenowwindow .showtriangle').svg({loadURL: STATIC_FILES + '/images/voting_triangle.svg', onLoad: initCVTriangle});
}

var QuestPermissions = function(desc, value) {
    this.desc = desc;
    this.perm = perm;
};

var TimePeriod = function(label, seconds) {
    this.period = label;
    this.seconds = seconds;
};

function get_timestamp()
{
    return Math.floor(new Date().getTime() / 1000);
}

function arrayFirstIndexOf(array, predicate, predicateOwner) {
    for (var i = 0, j = array.length; i < j; i++) {
        if (predicate.call(predicateOwner, array[i])) {
            return i;
        }
    }
    return -1;
}

var alert_flash = {'success': 'Success!', 'danger': 'Error!', 'warning': 'Warning!', 'info': 'Note!'};

jQuery.fn.extend({
    removeAlertClass: function() {
        return this.each(function() {
            var canDismiss = $(this).hasClass('alert-dismissable');
            $(this).removeClass(function (index, css) {
                return (css.match (/\balert-\S+/g) || []).join(' ');
            });
            if (canDismiss)
            {
                $(this).addClass('alert-dismissable');
            }
        });
    },
    setAlertClass: function(alert) {
        return this.each(function() {
            $(this).removeAlertClass().addClass('alert-'+alert);
        });
    },
    setAlert: function(alert, text) {
        return this.each(function() {
            $(this).setAlertClass(alert)
            .find('.text')
                .html(text)
            .end()
            .find('.flash')
                .html(alert_flash[alert])
            .end()
            .fadeIn()
        });
    }
});

function add_page_alert(alert, text)
{
    var alertbox = '<div class="main alert alert-'+ alert +' alert-dismissable">';
	alertbox = alertbox + '	<span class="flash">' + alert_flash[alert] + '</span> <span class="text">';
	alertbox = alertbox + text + '</span>';
	alertbox = alertbox +  '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button></div>';
	
	$('.container.main').prepend(alertbox);
	$('.alert.main').fadeIn();
}

function time_dhm(timestamp)
{
    var days = Math.floor(timestamp / 86400);
    timestamp = timestamp - (days * 86400);
    var hours = Math.floor(timestamp / 3600) % 24;
    timestamp = timestamp - (hours * 3600);
    var minutes = Math.floor(timestamp / 60) % 60;
    return days + ' days ' + hours + ' hours and ' + minutes + ' minutes ';
}

function CurrentUserViewModel()
{
	var self = this;
	self.username = ko.observable('');
    self.password = '';
	self.userid = ko.observable(0);
	self.authToken = '';
	self.user = false
	self.remember = false;

	self.isLoggedIn = ko.computed(function() {
        console.log('isLoggedIn...' + this.userid());
		return this.userid() != 0;
    }, this);

	self.isLoggedOut = ko.computed(function() {
        console.log('isLoggedOut...' + this.userid());
		return this.userid() == 0;
    }, this);

    // cat
	self.login = function(username, password, remember) {
		self.username(username);
		self.password = password;
		self.getAuthToken();
    }
	self.logout = function()
	{
		console.log("User logged out...");
		self.username("");
		self.password = "";
		self.authToken = '';
		self.user = false;
		self.userid(0);
		$.cookie('vgaclient', null, { path: '/' });
		//proposalsViewModel.fetchProposals();
		//resetGraphsAfterLogout();
		if (typeof(questionsViewModel) != 'undefined')
		{
		    questionsViewModel.questions([]);
		}
		if (typeof(proposalsViewModel) != 'undefined')
		{
		    proposalsViewModel.clearData();
		}
		window.location.replace(VILFREDO_URL);
	}
	self.beginLogin = function() {
        $('#login').modal('show');
    }
	self.loadUser = function()
	{
		// User already logged in
		if (this.userid() != 0)
		{
		    return;
		}
		if ($.cookie('vgaclient'))
		{
			self.authToken = $.cookie('vgaclient');
			return self.fetchCurrentUser();
		}
		else
		{
			return false;
		}
	}
	self.checkForToken = function()
	{
		if ($.cookie('vgaclient'))
		{
			self.authToken = $.cookie('vgaclient');
			return true;
		}
		else
		{
			return false;
		}
	}
	
	self.requestPasswordReset = function(email)
	{
		var URI = VILFREDO_API +'/request_password_reset';
		return ajaxRequest(URI, 'POST', {email: email}).done(function(data, textStatus, jqXHR) {
			loginViewModel().close();
			console.log('CurrentUserViewModel.requestPasswordReset');
			console.log(data);
		}).fail(function(jqXHR) {
           console.log('requestPasswordReset: There was an error. Status ' + jqXHR.status);
			$('#pwdreset .message .alert')
			.html(JSON.parse(jqXHR.responseText).message)
			.setAlertClass('danger')
			.fadeIn();
        });
	}
	
	self.getAuthToken = function()
	{
		var URI = VILFREDO_API +'/authtoken';
		$.cookie('vgaclient', null, { path: '/' });
		self.authToken = '';
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    self.authToken = data.token;
			loginViewModel().close();
			console.log('CurrentUserViewModel.getAuthToken:: Authtoken returned...');
			console.log(data);
			// Always remember login - for now
			$.cookie('vgaclient', data.token, {expires: 365, path: '/'});
			self.fetchCurrentUser();
		}).fail(function(jqXHR) {
           if (jqXHR.status == 403)
		    {
				$('#login .message').text('Sorry, your login details were not recognised.').fadeIn(500);
			}
        });
	}
	self.fetchCurrentUser = function()
	{
		var URI = VILFREDO_API + '/currentuser';
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) 
		{
		    console.log('Current user data returned...');
			console.log(data);
			self.userid(parseInt(data.user.id));
			console.log('fetchCurrentUser:: User ID set ==> ' + self.userid());
			self.user = data.user;
			self.username(data.user.username);
			
			if (typeof(questionsViewModel) != 'undefined')
			{
			    questionsViewModel.fetchQuestions();
			}
			
			if (proposalsViewModel)
			{
			    if (questionViewModel.phase() == 'writing')
			    {
			        proposalsViewModel.fetchProposals({user_only: true});
			    }
			    else
			    {
			        proposalsViewModel.fetchProposals();
			    }
			    resetGraphsForUser();
			}
		}).fail(function(jqXHR) {
           if (jqXHR.status == 401 || jqXHR.status == 403)
		   {
				console.log('Cookie token invalid or expired');
				$.cookie('vgaclient', null, { path: '/' });
				self.authToken = '';
		   }
        });
	}
}

function NewQuestionViewModel() 
{
    var self = this;
    self.title = ko.observable('').extend({ required: true, maxLength: 100, minLength:1 });
    self.blurb = ko.observable('').extend({ required: true, maxLength: 10000, minLength:1 });

    self.availableTimePeriods = ko.observableArray([
       new TimePeriod("1 second", 1),
       new TimePeriod("1 minute", 60),
       new TimePeriod("1 hour", 3600),
       new TimePeriod("1 day", 86400),
       new TimePeriod("1 week", 604800),
       new TimePeriod("30 days", 2592000)
    ]);
    
    self.minimum_time = ko.observable(self.availableTimePeriods()[2]);
    self.maximum_time = ko.observable(self.availableTimePeriods()[3]);
    
    self.resetform = function()
    {
		console.log("NewQuestionViewModel.resetform() called ...");
        self.title('');
        self.blurb('');
        self.title.isModified(false);
        self.blurb.isModified(false);
        self.minimum_time(self.availableTimePeriods()[2]);
        self.maximum_time(self.availableTimePeriods()[3]);
        $('#addquestion .alert').css('display', 'none').html('');
    }
    self.close = function()
    {
        console.log("NewQuestionViewModel.close() called ...");
        self.resetform();
        $('#addquestion').modal('hide');
    }
    self.add = function()
	{
		console.log("NewQuestionViewModel.add() called ...");
		
		questionsViewModel.addQuestion({
            title: self.title(),
            blurb: self.blurb(),
            minimum_time: self.minimum_time().seconds,
            maximum_time: self.maximum_time().seconds
        });
	}
}

function RegisterViewModel()
{
    var self = this;
    self.username = ko.observable('').extend({ required: true, maxLength: 50, minLength:2 });
    self.password = ko.observable('').extend({ required: true, maxLength: 60, minLength:6 });
    self.email = ko.observable('').extend({ required: true, maxLength: 50, minLength:2, email: true });
    
    self.reset = function()
    {
		self.username('');
        self.password('');
        self.email('');
        $('#register .alert').css('display', 'none').html('');
        self.username.isModified(false);
        self.password.isModified(false);
        self.email.isModified(false);
    }
    self.close = function()
    {
        self.reset();
        $('#register').modal('hide');
    }
    
    self.doregister = function()
    {
        self.reset();
        $('#register').modal('show');
    }
    
    self.register = function() {
		$('#register .message').text('').fadeOut(100);
		if (self.username() == '' || self.password() == '' || self.password() == '')
		{
			$('#register .message').text('You have not completed all the required fields.')
			.addClass('alert-danger')
			.fadeIn(500);
			return;
		}
        var new_user = {username: self.username(), password: self.password(), email: self.email()};
        ajaxRequest(VILFREDO_API + '/users', 'POST', new_user).done(function(data, textStatus, jqXHR) 
		{
		    console.log('toggleCommentSupport data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				console.log(data.message);
				registerViewModel().close();
				add_page_alert('success', 'Congratulations, you just registered with Vilfredo! You can now log in using your password.');				
			}
			else 
			{
				console.log("RegisterViewModel.register failed with status " + jqXHR.status);
				$('#register .alert')
				.html(data.message)
				.setAlertClass('danger')
				.fadeIn();
			}
		}).fail(function(jqXHR) 
		{
			console.log('register: There was an error with register. Error ' + jqXHR.status);
			$('#register .alert')
			.html(JSON.parse(jqXHR.responseText).message)
			.setAlertClass('danger')
			.fadeIn();
        });
    }
}

function LoginViewModel() 
{
    var self = this;
    self.username = ko.observable('').extend({ required: true, maxLength: 50, minLength:2 });
    self.password = ko.observable('').extend({ required: true, maxLength: 60, minLength:6 });
	self.remember = ko.observable(false);

    self.dologin = function() {
		$('#login .message').text('').fadeOut(100);
		if (self.username() == '' || self.password() == '')
		{
			$('#login .message').text('You have not completed all the required fields.').fadeIn(500);
			return;
		}
        currentUserViewModel.login(self.username(), self.password(), self.remember());
    }
    
	self.logout = function()
	{
		console.log("logout  called...");
		self.username = "";
		self.password = "";
		self.currentuser("");
		self.username.isModified(false);
		self.password.isModified(false);
		window.location.replace('index.html');
	}
	self.clear = function()
	{
		self.username(''); 
		self.password('');
		self.username.isModified(false);
		self.password.isModified(false);
		self.remember(false);
	}
	self.close = function()
	{
		$('#login .message').text('').hide();
		self.username('');
		self.password('');
		self.username.isModified(false);
		self.password.isModified(false);
		self.remember(false);
		$('#login').modal('hide');
	}
}

function ThreeWayVoteViewModel() 
{
    var self = this;
    self.id = ko.observable();
    self.uri = ko.observable();

    self.close3WayTriangle = function()
	{
		$('#vote3waywindow').modal('hide');
	}
}

function AddProposalViewModel() 
{
    var self = this;
    self.title = ko.observable('').extend({ required: true, maxLength: 100, minLength:1 });
    self.abstract = ko.observable('').extend({ maxLength: 5000 });
    self.blurb = ko.observable('').extend({ required: true, maxLength: 10000, minLength:1 });

    self.addProposal = function() { //now
        $('#addproposal .alert').text('').fadeOut(100);
		if (self.title() == '' || self.blurb() == '')
		{
			$('#addproposal .alert').text('You have not completed all the required fields.')
			.fadeIn(500);
			return;
		}
        proposalsViewModel.add({
            title: self.title(),
			abstract: self.abstract(),
            blurb: self.blurb()
        });
    }
    self.clear = function()
	{
		self.title(''); 
		self.abstract('');
		self.blurb('');
		self.title.isModified(false);
		self.abstract.isModified(false);
		self.blurb.isModified(false);
	}
	self.close = function()
	{
		$('#addproposal .alert').text('').hide();
		self.clear();
		$('#addproposal').modal('hide');
	}
}

function NewCommentViewModel()
{
	var self = this;
	self.comment = ko.observable().extend({ required: true, maxLength: 300, minLength:10 });
	
	self.validate_comment_type = ko.observable(true);
    self.comment_type = ko.observable().extend({ required: { onlyIf: self.validate_comment_type } });
	//self.comment_type = ko.observable().extend({ required: true });
	
	self.comment_type_options = ['for', 'against'];
	
	self.setProposal = function(proposal)
	{
		self.proposal = proposal;
	}
	
	self.clear = function() // noo
	{
	    console.log("newCommentViewModel clear called..");
	    self.comment('')
	    self.comment_type(null);
	    self.comment.isModified(false);
		self.comment_type.isModified(false);
		$('.newcommentpanel .alert')
				.html('')
				.setAlertClass('danger')
				.fadeOut();
	}
	
	self.resetNewCommentPanel = function()
	{
		console.log("resetNewCommentPanel called.....");
		var panel = $('.newcommentpanel');
		self.clear();
		if ($('.newcommentpanel').is(":visible"))
		{
          return panel.slideUp(400);
          self.clear();
        } 
		else
		{
			return true;
		}
	}
	self.showNewCommentPanel = function()
	{
		console.log("showNewCommentPanel called..");
		var panel = $('.newcommentpanel');
		if (panel.is(":visible")) 
		{
          panel.slideUp(400);
          self.resetNewCommentPanel();
        } 
		else 
		{
          panel.slideDown(400);
        }
	}
	
	self.add = function() // eating
	{
		console.log("NewCommentViewModel.add() called ...");		
		var reply_to = $('.newcommentpanel #reply_to').attr('value');
		var new_comment_type = $('.newcommentpanel #new_comment_type').attr('value');
		if (new_comment_type == 'answer' || new_comment_type == 'question')
		{
			viewProposalViewModel.addComment({
                comment: self.comment(),
                comment_type: new_comment_type,
				reply_to: reply_to
        	});
		}
		else 
		{
            viewProposalViewModel.addComment({
                comment: self.comment(),
                comment_type: self.comment_type()
            });
		}
	}
	
}

function ViewProposalViewModel()
{
	var self = this;
	self.id = ko.observable();
	self.title = ko.observable();
	self.blurb = ko.observable();
	self.author = ko.observable();
	self.endorse_type = ko.observable();
	self.comments = ko.observableArray();
	self.author_id = ko.observable();
	self.index;
	
	
	self.addcommentanswer = function(comment_id)
		{
			console.log("addcommentanswer called with id " + comment_id);
			var answer = $.trim($('.inputAnswerComment').filter(function() {
				return $(this).data("commentid") == comment_id;
			}).val());
			console.log(answer);
			if ( answer != '' )
			{
				viewProposalViewModel.addComment({
	                comment: answer,
	                comment_type: 'answer',
					reply_to: comment_id
	        	});
			}
		}
	
	
	self.getCommentCount = function()
	{
		var count = 0
		ko.utils.arrayFirst(self.comments(), function (comment)
        {
            if (comment.comment_type() == 'for' || comment.comment_type() == 'against')
			{
				count++;
			}
        });
        return count;
	};
	self.getQuestionCount = function()
	{
		var count = 0
		ko.utils.arrayFirst(self.comments(), function (comment)
        {
            if (comment.comment_type() == 'question')
			{
				count++;
			}
        });
        return count;
	};
	
	self.getAnswer = function(id)
    {
        var match = ko.utils.arrayFirst(self.comments(), function (comment)
        {
            return comment.reply_to() === id();
        });
        if (!match)
            return 'No answer yet';
        else
            return match.comment();
    };
	self.getAnswerObject = function(id)
    {
		var match = ko.utils.arrayFirst(self.comments(), function (comment)
        {
			return comment.reply_to() === id();
        });
        if (!match)
            return false;
        else
            return match;
    };
	
	self.userSupports = function(comment)
    {
		if (!comment)
		{
			return false;
		}
		var match = ko.utils.arrayFirst(comment.supporters(), function (supporter_id)
        {
            return supporter_id === parseInt(currentUserViewModel.user.id);
        });
        if (!match)
            return false;
        else
            return true;
    };
    
    self.addNewComment = function(comment, type, reply_to) // eating
	{
		console.log("ViewProposalViewModel.addComment() called ...");	
		var reply_to = $('.newcommentpanel #reply_to').attr('value');
		var new_comment_type = $('.newcommentpanel #new_comment_type').attr('value');
		if (new_comment_type == 'answer' || new_comment_type == 'question')
		{
			viewProposalViewModel.addComment({
                comment: self.comment(),
                comment_type: new_comment_type,
				reply_to: reply_to
        	});
		}
		else 
		{
            viewProposalViewModel.addComment({
                comment: self.comment(),
                comment_type: self.comment_type()
            });
		}
	}
	
	self.clearComments = function()
	{
		self.comments([]);
	}
	
	/* 
		View Proposal Panels
	*/
	self.reset = function()
	{
		$('#showquestions').css('display', 'none');
		$('#showcomments').css('display', 'none');
		$('.newcommentpanel').css('display', 'none');
		$('#propdetails').show(1);
	}
	self.displayProposalContent = function()
	{
		var $showing = $('#showquestions, #showcomments').filter(function() {
		   return $(this).is(':visible');
	    });
		$showing.hide(1, function()
		{
			$('#propdetails').show(1);
		});
	}
	self.showProposalContent = function()
	{
		newCommentViewModel().resetNewCommentPanel();
		var $showing = $('#showquestions, #showcomments').filter(function() {
		   return $(this).is(':visible');
	    });
		$showing.fadeOut(function()
		{
			$('#propdetails').fadeIn();
		});
	}
	self.showProposalComments = function()
	{
		newCommentViewModel().resetNewCommentPanel();
		var $showing = $('#propdetails, #showquestions').filter(function() {
		   return $(this).is(':visible');
	    });
		$showing.fadeOut(function()
		{
			$('#showcomments').fadeIn();
		});
	}
	self.showProposalQuestions = function()
	{
		newCommentViewModel().resetNewCommentPanel();
		var $showing = $('#propdetails, #showcomments').filter(function() {
		   return $(this).is(':visible');
	    });
		$showing.fadeOut(function()
		{
			$('#showquestions').fadeIn();
		});
	}
	
	self.beginNewComment = function(operation, proposalmodel, reply_to)
	{
		console.log('beginNewComment called with op ' + operation);
		//return;
		newCommentViewModel().setProposal(proposalmodel);
		$.when(newCommentViewModel().resetNewCommentPanel()).done(function()
		{
			if (operation == 'question')
			{
				$('.newcommentpanel #new_comment_type').attr('value', 'question');
				$('.newcommentpanel h4').text('Ask the author of the proposal a question');
				$('.newcommentpanel #form-type-select').addClass('hidden');
				$('.newcommentpanel #comment-label').text('Question');
				$('.newcommentpanel textarea').attr('placeholder', 'Question Text');
				newCommentViewModel().validate_comment_type(false);
			}
			else if (operation == 'answer')
			{
				$('.newcommentpanel #new_comment_type').attr('value', 'answer');
				$('.newcommentpanel #reply_to').attr('value', reply_to);
				$('.newcommentpanel h4').text('Answer this question');
				$('.newcommentpanel #form-type-select').addClass('hidden');
				$('.newcommentpanel #comment-label').text('Answer');
				$('.newcommentpanel textarea').attr('placeholder', 'Answer Text');
				newCommentViewModel().validate_comment_type(false);
			}
			else // comment
			{
				$('.newcommentpanel #new_comment_type').attr('value', 'comment');
				$('.newcommentpanel h4').text('Add a point for or aginst this proposal');
				$('.newcommentpanel #form-type-select').removeClass('hidden');
				$('.newcommentpanel #comment-label').text('Comment');
				$('.newcommentpanel textarea').attr('placeholder', 'Comment Text');
				newCommentViewModel().validate_comment_type(true);
			}
			console.log('comment_type default = ' + newCommentViewModel().comment_type());
			newCommentViewModel().showNewCommentPanel();
		});
	}
	
	self.beginAnswer = function(commentmodel)
	{
		console.log('beginAnswer called for comment ' + commentmodel.id());
		self.beginNewComment('answer', viewProposalViewModel, commentmodel.id());
	}

	self.toggleCommentSupport = function(comment)
	{
		console.log("ViewProposalViewModel.toggleCommentSupport() called for comment " + comment.id() + " ...");
		var OPP = 'POST';
		if (self.userSupports(comment))
		{
			OPP = 'DELETE';
		}
		var URI = VILFREDO_API + '/questions/'+ question_id +'/proposals/' + self.proposal.id() + '/comments/' + comment.id() + '/support';
		console.log("ViewProposalViewModel.supportComment() URI set to " + URI);
		ajaxRequest(URI, OPP).done(function(data, textStatus, jqXHR) 
		{
		    console.log('toggleCommentSupport data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				console.log(data.message);
				console.log('Updating comment ' + comment.id());
				comment.supporters(JSON.parse(data.supporters));
			}
			else
			{
				console.log(jqXHR.status);
			}
		});
	}
	
	self.addComment = function(comment) // eating
	{
		console.log("ViewProposalViewModel.addComment() called for proposal" + self.proposal.id() + " ...");
		var URI = VILFREDO_API + '/questions/'+ question_id +'/proposals/' + self.proposal.id() + '/comments';
		ajaxRequest(URI, 'POST', comment).done(function(data, textStatus, jqXHR) {
		    console.log('Add comment data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				//newCommentViewModel().showNewCommentPanel();
				console.log('Updating comments list for propsalal' + self.proposal.id());
				self.comments.push({
		      		id: ko.observable(data.comment.id),
					comment: ko.observable(data.comment.comment),
		      		comment_type: ko.observable(data.comment.comment_type),
		      		created: ko.observable(data.comment.created),
					reply_to: ko.observable(data.comment.reply_to),
					author_id: ko.observable(data.comment.author_id),
					supporters: ko.observableArray(JSON.parse(data.comment.supporters))
		  		});
			}
			else
			{
				console.log('addcomment: There was an problem adding the comment. Status ' + jqXHR.status);
				/*
				$('.newcommentpanel .alert')
				.html(data.message)
				.setAlertClass('danger')
				.fadeIn();
				*/
			}
		}).fail(function(jqXHR) 
		{
			console.log('addcomment: There was an error with add comment. Status ' + jqXHR.status);
			$('.newcommentpanel .alert')
			.html(JSON.parse(jqXHR.responseText).message)
			.setAlertClass('danger')
			.fadeIn();
        });
	}
	
	self.setIndex = function(index)
	{
		self.index = index;
	}
	
	self.openvotemap = function(proposal)
	{
		console.log("ViewProposalViewModel.openvotemap called with index " + index + ' and proposal ' + proposal.id());
		if (questionViewModel.phase() != 'voting') return;
		var index = proposalsViewModel.getProposalIndex(proposal.id());
		voteMapViewModel.proposal_index(index);
		voteMapViewModel.proposal_id(proposal.id());
		voteMapViewModel.endorse_type(proposal.endorse_type());
		$('#votemap-thisprop').html(proposal.title());
		$('#votemapwindow').modal('show');
	}
	
	self.setProposal = function(proposal)
	{
		self.proposal = proposal;
		self.id(proposal.id());
		self.title(proposal.title());
		self.blurb(proposal.blurb());
		self.author(proposal.author());
		self.author_id(proposal.author_id());
		self.endorse_type(proposal.endorse_type());
		self.comments([]);
		self.fetchComments();
	}
	/*
	self.init3WayTriangle = function(svg) 
	{
		console.log('ViewProposalViewModel.init3WayTriangle called **************');
		var index = parseInt($(this).data('index'));
		console.log("init3WayTriangle: setting with index " + index);
		$('.oppose', svg.root()).click(function(e) {
			console.log("I oppose proposal with index " + index);
			proposalsViewModel.endorseWithIndex('oppose', index);
		});
		$('.endorse', svg.root()).click(function(e) {
        	console.log("I endorse proposal with index " + index);
			proposalsViewModel.endorseWithIndex('endorse', index);
		});
		$('.confused', svg.root()).click(function(e) {
        	console.log("I do not understand proposal with index " + index);
			proposalsViewModel.endorseWithIndex('confused', index);
		});
	}*/
	
	self.loadTriangle = function()
	{
		console.log("ViewProposalViewModel.loadTriangle called>>>>>>>>>>>>>>>");
		if (questionViewModel.phase() == 'voting')
		{
			console.log('Loading voting triangle to view proposal window...');
			
			/*
			if ($('.votebox').svg('get'))
            {
                console.log('Removing svg from votebox------------');
                $('.votebox').svg('destroy').data('pid', false).data('index', false);
            }*/
			
			$('.votebox').data('pid', self.proposal.id).addClass('threeway').data('index', self.index);
			//$('.votebox').svg({loadURL: flask_util.url_for('static', {filename:'images/triangle.svg'}),
			/*
			$('.votebox').svg({loadURL: STATIC_FILES + '/images/triangle.svg', //});
							   onLoad: init3WayTriangle});
			*/
			
			//var bg_image = "url('" + STATIC_FILES + "/images/triangle.svg" + "')";
			//$('.votebox').css('background-image', bg_image);
		}
	}
	
	self.fetchComments = function() {
		ajaxRequest(VILFREDO_API + '/questions/'+ question_id +'/proposals/'+ self.proposal.id() +'/comments', 
					'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Comments data returned...');
			console.log(data);
			for (var i = 0; i < data.comments.length; i++) {
		  		var supporters = JSON.parse(data.comments[i].supporters)
				self.comments.push({
		      		id: ko.observable(data.comments[i].id),
					comment: ko.observable(data.comments[i].comment),
		      		comment_type: ko.observable(data.comments[i].comment_type),
		      		created: ko.observable(data.comments[i].created),
					reply_to: ko.observable(data.comments[i].reply_to),
					author_id: ko.observable(data.comments[i].author_id),
					supporters: ko.observableArray(JSON.parse(data.comments[i].supporters))
		  		});
			}
			console.log(data.comments.length + " comments loaded");
		});
	}
}



function QuestionsViewModel()
{
    var self = this;
    self.questions = ko.observableArray();
    
    self.addQuestion = function(question) 
	{
		console.log("QuestionsViewModel.addQuestion() called...");
		console.log(question);
		var URI = VILFREDO_API + '/questions';
		ajaxRequest(URI, 'POST', question).done(function(data, textStatus, jqXHR) {
		    console.log('Add question data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				newQuestionViewModel().close();
				
				console.log('Updating questions list');
				self.questions.push({
		      		id: ko.observable(data.question.id),
					title: ko.observable(data.question.title),
		      		blurb: ko.observable(data.question.blurb),
		      		author: ko.observable(data.question.author),
					uri: ko.observable(data.question.url),
					phase: ko.observable(data.question.phase),
					last_move_on : ko.observable(parseInt(data.question.last_move_on)),
            		minimum_time : ko.observable(parseInt(data.question.minimum_time)),
            		maximum_time : ko.observable(parseInt(data.question.maximum_time)),
					author_id: ko.observable(parseInt(data.question.author_id)),
					generation: ko.observable(parseInt(data.question.generation)),
					proposal_count: ko.observable(parseInt(data.question.proposal_count)),
					new_proposal_count: ko.observable(parseInt(data.question.new_proposal_count)),
					new_proposer_count: ko.observable(parseInt(data.question.new_proposer_count)),
					consensus_found: ko.observable(data.question.consensus_found),
					inherited_proposal_count: ko.observable(parseInt(data.question.inherited_proposal_count)),
					link: VILFREDO_URL + "/question/" + data.question.id
		  		});
			}
			else
			{
				console.log(jqXHR.status);
				$('.addquestion .alert')
				.html(data.message)
				.setAlertClass('danger')
				.fadeIn()
			}
		}).fail(function(jqXHR) {
            console.log('addQuestion: There was an error. Error ' + jqXHR.status);
            // Set modal alert
            $('#addquestion .alert')
            .text(JSON.parse(jqXHR.responseText).message)
            .setAlertClass('danger')
            .fadeIn()
        });
	}
	
	/*
	Fetch the questions which the user is permitted to see
	*/
    self.fetchQuestions = function() {
		if (currentUserViewModel.isLoggedOut()) return false;
		console.log("Fetching questions...");
		var url = VILFREDO_API + '/questions';
		var room_query = (room) ? '?room=' + room : '';
		ajaxRequest(url+room_query, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Questions data returned...');
			console.log(data);
			self.questions([]);
			for (var i = 0; i < data.questions.length; i++) {
		  		self.questions.push({
		      		id: ko.observable(data.questions[i].id),
					title: ko.observable(data.questions[i].title),
		      		blurb: ko.observable(data.questions[i].blurb),
		      		author: ko.observable(data.questions[i].author),
					uri: ko.observable(data.questions[i].url),
					phase: ko.observable(data.questions[i].phase),
					last_move_on : ko.observable(parseInt(data.questions[i].last_move_on)),
            		minimum_time : ko.observable(parseInt(data.questions[i].minimum_time)),
            		maximum_time : ko.observable(parseInt(data.questions[i].maximum_time)),
					author_id: ko.observable(parseInt(data.questions[i].author_id)),
					generation: ko.observable(parseInt(data.questions[i].generation)),
					proposal_count: ko.observable(parseInt(data.questions[i].proposal_count)),
					new_proposal_count: ko.observable(parseInt(data.questions[i].new_proposal_count)),
					new_proposer_count: ko.observable(parseInt(data.questions[i].new_proposer_count)),
					consensus_found: ko.observable(data.questions[i].consensus_found),
					inherited_proposal_count: ko.observable(parseInt(data.questions[i].inherited_proposal_count)),
					link: VILFREDO_URL + "/question/" + data.questions[i].id
		  		});
			}
		});
	}
	self.beginNewQuestion = function()
	{
	    console.log('begin_new_question'); 
	    $('#addquestion').modal('show');
	}
	self.is_new_question = function(question)
	{
	    return question.generation() == 1 && question.proposal_count() == 0;
	}
	self.tooltip = function(question)
	{
	    html = "<div>";
	    html = html + question.blurb().substr(0, 150) + '...</div>';
	    html = html + "<strong>Generation: " + question.generation() + "</strong>";
	    if (question.new_proposal_count() > 0)
	    {
	        html = html + "<br>Recently "
	            + question.new_proposer_count() + " users proposed " 
	            + question.new_proposal_count() + " proposals";
	    }
	    else
	    {
	        html = html + "<br>No new proposals so far.";
	    }
	    if (question.inherited_proposal_count() > 0)
	    {
	        html = html + "<br>There are " 
		        + question.inherited_proposal_count() 
		        + " inherited from the previous generation";
	    }
	    return html;
	}
	self.minimum_time_passed = function(question)
	{
        return (get_timestamp() - question.last_move_on()) > question.minimum_time();
    }
    self.maximum_time_passed = function(question)
    {
        return (get_timestamp() - question.last_move_on()) > question.maximum_time();
	}
}

function VoteMapViewModel()
{
    var self = this;
    self.proposal_index = ko.observableArray();
    self.proposal_id = ko.observableArray();
    self.endorse_type = ko.observableArray();
}

function ProposalsViewModel()
{
    var self = this;
    
	// Voting phase only
	self.proposals = ko.observableArray();
	self.key_players = ko.observableArray();
	// Writing phase only
	self.inherited_proposals = ko.observableArray();
	
	self.clearData = function()
	{
	    self.proposals([]);
	    self.key_players([]);
	    self.inherited_proposals([]);
	}
	
	self.getProposal = function(pid) // huh
    {
		var match = ko.utils.arrayFirst(self.proposals(), function (proposal)
        {
			return proposal.id() === parseInt(pid);
        });
        if (!match)
            return false;
        else
            return match;
    };
	
	self.getUserKeyPlayerInfo = function() //donow
    {
        var match = ko.utils.arrayFirst(self.key_players(), function (key_player)
        {
            return currentUserViewModel.userid() === key_player.id();
        });
        console.log('getUserKeyPlayerInfo');
        if (match) 
        {
            //console.log('Current user IS a key player');
            //console.log(match.id());
        }
        else
        {
            //console.log('Current user IS NOT a key player');
        }
        return match;
    };
	
	self.vote_for_list_v3 = function (props) 
	{
	    html = '';
	    for (var i = 0; i < props.length; i++) 
	    {
	        html = html + '<span class="prop_link">' + props[i] + '</span>'
	    }
	    return html;
    }
	
	self.vote_for_list_v2 = function (keyplayer) 
	{
	    html = '';
	    $.each(keyplayer.add_vote(), function (endorse_type, pids) 
	    {
            switch(endorse_type)
            {
                case 'notvoted':
                    html = html + '<br>Did not vote for proposals '
                    $.each(pids, function (pid) 
                    {
                        html = html + '<span class="prop_link">' + pid + '</span>'
                    })
                    break;
                case 'oppose':
                    html = html + '<br>Voted against proposals '
                    $.each(pids, function (pid) 
                    {
                        html = html + '<span class="prop_link">' + pid + '</span>'
                    })
                    break;
                case 'confused':
                    html = html + '<br>Did not understand proposals '
                    $.each(pids, function (pid) 
                    {
                        html = html + '<span class="prop_link">' + pid + '</span>'
                    })
                    break;
                default:  
            }
        })
	    return html;
	}
	
	self.vote_for_list = function (keyplayer) {
	    html = '';
	    for (var i = 0; i < keyplayer.add_vote().length; i++) 
	    {
	        html = html + '<span class="prop_link">' + keyplayer.add_vote()[i] + '</span>'
	    }
	    return html;
	}
	
	self.getProposalIndex = function(proposal_id)
	{
	    console.log("ProposalsViewModel.getProposalIndex() called with pid = " + proposal_id);
	    return arrayFirstIndexOf(proposalsViewModel.proposals(), function(item) {
           return item.id() === proposal_id;    
        });
	}
	
	self.showProposalNode = function(proposal_id)
	{
	    console.log("ProposalsViewModel.showProposalNode() called with pid = " + proposal_id);
	    var index = arrayFirstIndexOf(proposalsViewModel.proposals(), function(item) {
           return item.id() === proposal_id;    
        });
        var proposal = proposalsViewModel.proposals()[index];
	    self.read(index, proposal);
	}
	
	self.readproposal = function(id)
	{
	    console.log("ProposalsViewModel.readproposal called with id " + id);
	    index = self.fetchIndex(id);
	}
	
	self.openvotemap = function(index, proposal)
	{
		console.log("ProposalsViewModel.openvotemap called with index " + index + ' and proposal ' + proposal.id());
		voteMapViewModel.proposal_index(index);
		voteMapViewModel.proposal_id(proposal.id());
		voteMapViewModel.endorse_type(proposal.endorse_type());
		$('#votemap-thisprop').html(proposal.title());
		$('#votemapwindow').modal('show');
	}
	
	self.read = function(index, proposal)
	{
		console.log("ProposalsViewModel.read called with index " + index);
		viewProposalViewModel.setProposal(proposal);
		viewProposalViewModel.index = index;
		viewProposalViewModel.loadTriangle();
		viewProposalViewModel.reset();
		$('#viewproposal').modal('show');
	}
	
	self.add = function(proposal)
	{
		var URI = VILFREDO_API + '/questions/'+ question_id +'/proposals';
		ajaxRequest(URI, 'POST', proposal).done(function(data, textStatus, jqXHR) {
		    console.log('Proposals data returned...');
			console.log(data);
			console.log('textstatus = ' + textStatus);
			console.log('status code = ' + jqXHR.statusCode());
			
			if (jqXHR.status == 201)
			{
	  		    self.proposals.push({
					id: ko.observable(parseInt(data.proposal.id)),
					title: ko.observable(data.proposal.title),
		      		blurb: ko.observable(data.proposal.blurb),
		      		author: ko.observable(data.proposal.author),
					endorse_type: ko.observable(data.proposal.endorse_type),
					uri: ko.observable(data.proposal.uri),
					author_id: ko.observable(parseInt(data.proposal.author_id)),
					question_count: ko.observable(parseInt(data.proposal.question_count)),
					comment_count: ko.observable(parseInt(data.proposal.comment_count))
		  		});
		  		addProposalViewModel().close();
	  		}
	  		else
			{
				console.log(jqXHR.status);
				$('#addproposal .alert')
				.text(data.error)
				.setAlertClass('danger')
				.fadeIn()
			}
		}).fail(function(jqXHR) {
            console.log('register: There was an error with register. Error ' + jqXHR.status);
            $('#addproposal .alert')
            .text(JSON.parse(jqXHR.responseText).message)
            .setAlertClass('danger')
            .fadeIn()
        });
	}
	
	self.endorse = function(endorsement_type, proposal)
	{
		if (currentUserViewModel.isLoggedIn() == false)
		{
		    console.log("Not logged in");
		    return;
		}
		console.log(endorsement_type);
		var endorse_uri = VILFREDO_API + '/questions/'+ question_id +'/proposals/'+ proposal.id() +'/endorsements';
		console.log('endorse uri = ' + endorse_uri);
		
		ajaxRequest(endorse_uri, 'POST', {endorsement_type:endorsement_type})
		.done(function(data, textStatus, jqXHR)
		{
		    console.log('Proposals data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				console.log('Updating proposal ' + proposal.id() + ' to ' + endorsement_type);

				var prev_endorsement_type = proposal.endorse_type();
				proposal.endorse_type(endorsement_type);
				if ( (prev_endorsement_type == 'endorse'
					&& (endorsement_type == 'confused' || endorsement_type == 'oppose')) 
				|| (endorsement_type == 'endorse'
					&& (prev_endorsement_type == 'confused' || prev_endorsement_type == 'oppose'
					    || prev_endorsement_type == 'notvoted')) )
				{
					console.log('Refreshing graphs after vote...');
					fetchVotingGraphs();
				}
			}
			else
			{
				console.log(jqXHR.status);
			}
		});
	}
	
	// Add endorsement using normalised votemap coordinates
	self.mapEndorseWithIndex = function(mapx, mapy, index) // eel
	{
		if (currentUserViewModel.isLoggedIn() == false)
		{
		    console.log("Not logged in");
		    return;
		}
		
		var proposal = self.proposals()[index];
		console.log('mapEndorseWithIndex called with index ' + index + ' and coords ' + mapx + ', ' + mapy);
		var endorse_uri = VILFREDO_API + '/questions/'+ question_id +'/proposals/'+ proposal.id() +'/endorsements';
		console.log('endorse uri = ' + endorse_uri);
		
		// Normalized vote coordinates
        var coords = {mapx: mapx, mapy: mapy};
		
		ajaxRequest(endorse_uri, 'POST', {use_votemap:true, coords:coords})
		.done(function(data, textStatus, jqXHR)
		{
		    console.log('Proposals data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				console.log('Updating proposal ' + proposal.id() + ' to ' + data.endorsement_type);
				var prev_endorsement_type = proposal.endorse_type();
				proposal.endorse_type(data.endorsement_type);
				viewProposalViewModel.setProposal(proposal);
				if ( (prev_endorsement_type == 'endorse'
					&& (data.endorsement_type == 'confused' || data.endorsement_type == 'oppose')) 
				|| (data.endorsement_type == 'endorse'
					&& (prev_endorsement_type == 'confused' || prev_endorsement_type == 'oppose'
					    || prev_endorsement_type == 'notvoted')) )
				{
					console.log('Refreshing graphs after vote...');
					fetchVotingGraphs(); // chaos
				}
				
				// Update vote coordinates and endorsement type
				proposal.endorse_type(data.endorsement_type);
				proposal.mapx = mapx;
				proposal.mapy = mapy;
				
				// Draw vote on votemap if displayed
				setVote(proposal);
				/*
				var svg = $('#modalvotesmap').svg('get');
				if (svg)
				{
				    setVote(svg, proposal);
				}
				*/
				// reset key players
				self.fetchKeyPlayers();
				// reset participation table
				questionViewModel.fetchParticipationTable();
				redoResultsMap();
			}
			else
			{
				console.log(jqXHR.status);
			}
		});
	}
	
	self.endorseWithIndex = function(endorsement_type, index)
	{
		if (currentUserViewModel.isLoggedIn() == false)
		{
		    console.log("Not logged in");
		    return;
		}
		var proposal = self.proposals()[index];
		console.log('endorseWithIndex called with index ' + index + ' and endorsement_type ' + endorsement_type);
		var endorse_uri = VILFREDO_API + '/questions/'+ question_id +'/proposals/'+ proposal.id() +'/endorsements';
		console.log('endorse uri = ' + endorse_uri);
		
		ajaxRequest(endorse_uri, 'POST', {endorsement_type:endorsement_type})
		.done(function(data, textStatus, jqXHR)
		{
		    console.log('Proposals data returned...');
			console.log(data);
			
			if (jqXHR.status == 201)
			{
				console.log('Updating proposal ' + proposal.id() + ' to ' + endorsement_type);
				var prev_endorsement_type = proposal.endorse_type();
				proposal.endorse_type(endorsement_type);
				viewProposalViewModel.setProposal(proposal);
				if ( (prev_endorsement_type == 'endorse'
					&& (endorsement_type == 'confused' || endorsement_type == 'oppose')) 
				|| (endorsement_type == 'endorse'
					&& (prev_endorsement_type == 'confused' || prev_endorsement_type == 'oppose'
					    || prev_endorsement_type == 'notvoted')) )
				{
					console.log('Refreshing graphs after vote...');
					fetchVotingGraphs();
				}
				// reset key players
				self.fetchKeyPlayers();
			}
			else
			{
				console.log(jqXHR.status);
			}
		});
	}
	
	self.show3WayTriangle = function()
	{
		console.log('show3WayTriangle called...');
		$('#vote3waywindow').modal('show');		
		$('#vote3waywindow .show3waytriangle').svg(
		    {loadURL: flask_util.url_for('static', {filename:'images/triangle.svg'})}); //,
		//	onLoad: init3WayTriangle});	
	}
	
	self.showTriangle = function()
	{
		console.log('showTriangle called...');
		return;
		$('#votenowwindow').modal('show');
		//$('.showtriangle').svg({onLoad: drawVotingTriangle});
		$('#votenowwindow .showtriangle').svg(
		    {loadURL: flask_util.url_for('static', {filename:'images/triangle.svg'}), 
		    onLoad: initTriangle});
	}
	
	self.fetchKeyPlayers = function() {
		var URI = VILFREDO_API + '/questions/' + question_id + '/key_players?' + 'algorithm=' + ALGORITHM_VERSION;	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Key Player data returned...');
			console.log(data.key_players);
			//console.log(data.key_players[0]);
			//console.log(data.key_players[0]['user'].id);
			//return;
			self.key_players([]);
			for (var i = 0; i < data.key_players.length; i++) {
		  		self.key_players.push({
		      		id: ko.observable(parseInt(data.key_players[i]['user'].id)),
					username: ko.observable(data.key_players[i]['user'].username),
		      		add_vote: ko.observable(data.key_players[i]['add_vote'])
		  		});
			}
		});
	}
	
	self.fetchInheritedProposals = function() {
	    console.log('fetchInheritedProposals() called...');
		var proposalsURI = VILFREDO_API + '/questions/'+ question_id +'/proposals';
		proposalsURI = proposalsURI + '?inherited_only=true';

		return ajaxRequest(proposalsURI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Proposals data returned...');
			console.log(data);
			self.proposals([]);
			for (var i = 0; i < data.proposals.length; i++) {
		  		self.inherited_proposals.push({
		      		id: ko.observable(parseInt(data.proposals[i].id)),
					title: ko.observable(data.proposals[i].title),
		      		blurb: ko.observable(data.proposals[i].blurb),
		      		author: ko.observable(data.proposals[i].author),
					endorse_type: ko.observable(data.proposals[i].endorse_type),
					uri: ko.observable(data.proposals[i].uri),
					author_id: ko.observable(parseInt(data.proposals[i].author_id)),
					question_count: ko.observable(parseInt(data.proposals[i].question_count)),
					comment_count: ko.observable(parseInt(data.proposals[i].comment_count)),
					mapx: parseFloat(data.proposals[i].mapx),
					mapy: parseFloat(data.proposals[i].mapy)
		  		});
			}
		});
	}

	self.fetchProposals = function(options) {
	    console.log('fetchProposals() called...');
		var proposalsURI = VILFREDO_API + '/questions/'+ question_id +'/proposals';
		var proposals_list = self.proposals;
		
	    if (options != null && options.user_only != null)
	    {
	        proposalsURI = proposalsURI + '?user_only=true';
	    }
	    /*
	    else if (options != null && options.inherited_only != null)
	    {
	        proposalsURI = proposalsURI + '?inherited_only=true';
	        // Add to inherited list
	        proposals_list = self.inherited_proposals;
	    }
	    */
		return ajaxRequest(proposalsURI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Proposals data returned...');
			console.log(data);
			self.proposals([]);
			for (var i = 0; i < data.proposals.length; i++) {
		  		proposals_list.push({
		      		id: ko.observable(parseInt(data.proposals[i].id)),
					title: ko.observable(data.proposals[i].title),
		      		blurb: ko.observable(data.proposals[i].blurb),
		      		author: ko.observable(data.proposals[i].author),
					endorse_type: ko.observable(data.proposals[i].endorse_type),
					uri: ko.observable(data.proposals[i].uri),
					author_id: ko.observable(parseInt(data.proposals[i].author_id)),
					question_count: ko.observable(parseInt(data.proposals[i].question_count)),
					comment_count: ko.observable(parseInt(data.proposals[i].comment_count)),
					mapx: parseFloat(data.proposals[i].mapx),
					mapy: parseFloat(data.proposals[i].mapy)
		  		});
			}
			
			if (questionViewModel.phase() == 'voting' && questionViewModel.can_vote)
			{
				$('.voting').each(function(){
					var index = $(this).parents('.panel').siblings('.index')[0].value;
					var pid = $(this).parents('.panel').siblings('.propId')[0].value;
					//console.log('adding pid ' + pid + ' and threeway class to voting container...');
					$(this).data('pid', pid).addClass('threeway').data('index', index);
					//console.log('check if pid added ==> ' + $(this).data('pid'));
					console.log('Load triangle into proposal box');
					//$(this).svg({loadURL: flask_util.url_for('static', {filename:'images/triangle.svg'}),
					$(this).svg({loadURL: STATIC_FILES + '/images/triangle.svg'});//,
					//			 onLoad: init3WayTriangle});
				});
				self.fetchKeyPlayers();
			}
		});
	}
	
	self.beginNew = function() {
        $('#addproposal').modal('show');
    }
	
	//self.fetchProposals();
	//self.beginLogin();
}


function drawTriangle(svg)
{
	var path = svg.createPath();
    var triangle = svg.path(
        path.move( 100, 0)
        .line( -100, 200, true )
        .line( 200, 0, true )
        .close(),
        {
            fill: 'blue', 
            stroke: 'white', 
            strokeWidth: 2
        }
    );
}

function setTriangleSize(svg) 
{
	//console.log("setTriangleSize called...");
	var width = 700;
	var height = 700; 
	gwidth = width || $(svg._container).innerWidth();
	gheight = height || $(svg._container).innerHeight();
	svg.configure({width: gwidth, height: gheight}, true);
}

function initTriangle(svg)
{
	var tri = $('#votenowwindow .showtriangle .votenow');
	$('#votenowwindow .showtriangle .votenow').on( "click", function(e) {
    	var posX = $(this).offset().left,
        posY = $(this).offset().top;
    	console.log((e.pageX - posX) + ' , ' + (e.pageY - posY));
	});
}

/*
function init3WayTriangle(svg)
{
	console.log('init3WayTriangle function called');
	return;
	
	var index = parseInt($(this).data('index'));
	console.log('init3WayTriangle function called... index = ' + index);
	$('.oppose', svg.root()).click(function(e) {
		//console.log("I oppose proposal " + index);
		proposalsViewModel.endorseWithIndex('oppose', index);
	});
	$('.endorse', svg.root()).click(function(e) {
    	//console.log("I endorse proposal " + index);
		proposalsViewModel.endorseWithIndex('endorse', index);
	});
	$('.confused', svg.root()).click(function(e) {
    	//console.log("I do not understand proposal " + index);
		proposalsViewModel.endorseWithIndex('confused', index);
	});
}*/

function drawVotingTriangle(svg)
{
	//svg.polygon([[0,0],[300,0],[150,211]],
	//	{fill: 'lime', stroke: 'blue', strokeWidth: 1, class: 'votenow'});
	
	svg.polygon([[1,1],[299,1],[149,210]],
		{fill: 'lime', stroke: 'blue', strokeWidth: 1, class: 'votenow'}); 
				
	/*
	svg.linearGradient(defs, 'myGrad', 
    	[[0, 'red'], [1, 'green']], 0, 0, 800, 0, 
	    {gradientUnits: 'userSpaceOnUse'});*/
}


/*
var questionViewModel = function(data) {
    ko.mapping.fromJS(data, {}, this);

    this.nameLength = ko.computed(function() {
        return this.name().length;
    }, this);
    
    this.canMoveOn = ko.computed(function() {
	    var currentdate = new Date();
	    var currentSeconds = currentdate.getSeconds();
	    console.log(this.minimum_time());
	    return true;
	};
}*/

function InviteUsersViewModel() // shark
{
    var self = this;
    // Update subscribers after 50 microseconds 
    self.users = ko.observableArray([]).extend({ rateLimit: 50 });
    self.user_emails = ko.observable();
    
    self.questionPermissions = ko.observable([
       {name: "Read", id: 1},
       {name: "Vote", id: 3},
	   {name: "Propose", id: 5},
	   {name: "Vote, Propose", id: 7}
    ]);
    
    self.questionEmailPermissions = ko.observable([
       {name: "Read", id: 1},
       {name: "Vote", id: 3},
	   {name: "Propose", id: 5},
	   {name: "Vote, Propose", id: 7}
    ]);
    
    self.selectedPermissions = 7;
    
    self.invite_by_email = function()
	{
	    console.log("invite_by_email called...");
	    
        var URI = VILFREDO_API + '/questions/' + question_id + '/emailinvitations';
        var invite_users = {'user_emails': self.user_emails(), 'permissions': self.selectedPermissions};
		return ajaxRequest(URI, 'POST', invite_users).done(function(data, textStatus, jqXHR) {
		    console.log('Email invitations sent...');
		    // Remove the added users from the list of uninvited users
		    console.log(data.invites.rejected);
			self.user_emails(data.invites.rejected);
		});
	}

    // 
    // Fetch non-participating associated users
    //
    self.fetch_associated_users = function() 
	{
		self.users([]);
		var URI = VILFREDO_API + '/users/associated_users?ignore_question=' + question_id;	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Not invited list returned...');
			for (var i = 0; i < data.not_invited.length; i++) {
				self.users.push({
		      		user_id: data.not_invited[i].user_id,
					username: data.not_invited[i].username,
		      		selected: ko.observable(false)
		  		});
			}
		});
	}
    
    self.fetch_uninvited_associates = function() 
	{
		self.users([]);
		var URI = VILFREDO_API + '/questions/' + question_id + '/not_invited';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Not invited list returned...');
			for (var i = 0; i < data.not_invited.length; i++) {
				self.users.push({
		      		user_id: data.not_invited[i].user_id,
					username: data.not_invited[i].username,
		      		selected: ko.observable(false)
		  		});
			}
		});
	}
    
    /*
	self.fetch_non_participants = function() 
	{
		self.users([]);
		var URI = VILFREDO_API + '/questions/' + question_id + '/not_invited';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Not invited list returned...');
			for (var i = 0; i < data.not_invited.length; i++) {
				self.users.push({
		      		user_id: data.not_invited[i].user_id,
					username: data.not_invited[i].username,
		      		selected: ko.observable(false)
		  		});
			}
		});
	}
	*/
	
	self.add_users = function()
	{
	    console.log("add_users called...");
	    var invite_user_ids = new Array();
	    ko.utils.arrayForEach(self.users(), function(user) 
	    {
            if (user.selected()) 
            {
                invite_user_ids.push(user.user_id);
            }
        });
        console.log('Selected Users = [' + invite_user_ids + ']');
        var URI = VILFREDO_API + '/questions/' + question_id + '/invitations';
        var invite_users = {'invite_user_ids': invite_user_ids, 'permissions': self.selectedPermissions};
		return ajaxRequest(URI, 'POST', invite_users).done(function(data, textStatus, jqXHR) {
		    console.log('Users added to list of participants...');
		    // Remove the added users from the list of uninvited users
			self.users.remove(function(user) { return user.selected(); });
		});
	}
	self.open_add_users = function() 
	{
	    console.log("open_permissions.open called...");
	    self.permissions(questionViewModel.permissions());
	    $('#participants').modal('show');
	}
	self.close_add_users = function() 
	{
	    console.log("close_permissions called...");
	    $('#add_users').modal('hide');
	    permissionsViewModel.fetchParticipantPermissions();
	    $('#participants').modal('show');
	}
}
function PermissionsViewModel() // shark
{
    var self = this;
    self.permissions = ko.observableArray([]);
    
    self.questionPermissions = ko.observable([
       {name: "Read", id: 1},
       {name: "Vote", id: 3},
	   {name: "Propose", id: 5},
	   {name: "Vote, Propose", id: 7}
    ]);
    
    self.selectedPermissions = 7;
    
    self.userPerms = function (user, perm) {
        return ko.computed({
            read: function () {
                return !!(user.permissions & perm);
            },
            write: function (checked) {
                if (checked)
                    user.permissions = user.permissions | perm;
                else
                    user.permissions = user.permissions & ~perm;
            }
        }, user);
    };

	self.fetchParticipantPermissions = function() // jaws
	{
		self.permissions([]); // haha
		var URI = VILFREDO_API + '/questions/' + question_id + '/permissions';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Question results returned...');
			//self.permissions(data.permissions);
			for (var i = 0; i < data.permissions.length; i++) {
				self.permissions.push({
		      		user_id: data.permissions[i].user_id,
					username: data.permissions[i].username,
					permissions: parseInt(data.permissions[i].permissions)
		  		});
			}
		});
	}
	self.open_permissions = function() 
	{
	    console.log("open_permissions.open called...");
	    //self.permissions(questionViewModel.permissions());
	    self.fetchParticipantPermissions();
	    $('#participants').modal('show');
	}
	
	self.add_users = function()
	{
	    console.log("add_users called...");
	    inviteUsersViewModel.fetch_associated_users();
	    $('#participants').modal('hide');
	    $('#add_users').modal('show');
	}
	self.update_permissions = function()
	{
	    console.log("update_permissions called...");
	    questionViewModel.updatePermissions(self.permissions);
	}
	self.close_permissions = function() 
	{
	    console.log("close_permissions called...");
	    $('#participants').modal('hide');
	}
	self.reset_permissions = function() 
	{
	    console.log("reset_permissions called...");
	    self.permissions(questionViewModel.permissions());
	}
	self.remove_permissions = function() 
	{
	    // remove permissions for user - in other words exclude him completely from the question
	    console.log("remove_permissions called for user " + this.user_id);
	    self.permissions.remove(this);
	}
}

function QuestionViewModel()
{
	var self = this;
	self.URI = VILFREDO_API + '/questions/' + question_id;		
	self.id = ko.observable();
	self.title = ko.observable();
	self.blurb = ko.observable();
	self.author = ko.observable();
	self.author_id = ko.observable();
	self.phase = ko.observable();
	self.generation = ko.observable();
	self.last_move_on = ko.observable();
	self.minimum_time = ko.observable();
	self.maximum_time = ko.observable();
	self.mapx = ko.observable();
	self.mapy = ko.observable();
	self.proposal_count = ko.observable();
	self.created;
	self.proposal_relations;
	self.can_vote = false;
	self.can_propose = false;
	self.can_propose_ob = ko.observable(false);
	self.can_not_propose = false;
	
	self.key_players = ko.observableArray();
	
	self.participation_table = ko.observable();
	self.num_proposals = ko.observable();
	
	self.domination_map_array = ko.observableArray([]);
	//self.domination_map = ko.observable();
	self.levels_map = ko.observable();
	self.voting_map = ko.observable();
	
    
    self.dom_table_algorithm = ko.observable(ALGORITHM_VERSION);
	self.levels_table_algorithm = ko.observable(ALGORITHM_VERSION);
	
	self.selected_generation = ko.observable(generation_id);
	self.selected_algorithm = ko.observable(ALGORITHM_VERSION);
	
	self.permissions = ko.observable([]);
	
	self.results;
	
	self.questionPermissions = ko.observableArray([
       {name: "Read", id: 1},
       {name: "Vote", id: 3},
	   {name: "Propose", id: 5},
	   {name: "Vote, Propose", id: 7}
    ]);
    
    self.defaultPermissions = 7;
	
	self.permissionTitles = function(val)
	{
	    switch(parseInt(val))
        {
        case 1:
            return 'Read';
            break;
        case 3:
            return 'Vote';
            break;
        case 5:
            return 'Propose';
            break;
        case 7:
            return 'Propose, Vote';
            break;
        default:
            return '-';
        }
	}
	
	// shark
	self.updatePermissions = function()
	{
	    console.log("updatePermissions called...");
	}
	self.closePermissions = function() 
	{
	    console.log("closePermissions called...");
	    $('#participants').modal('hide');
	}
	self.resetPermissions = function() 
	{
	    console.log("resetPermissions called...");
	}
	self.removePermissions = function() 
	{
	    // remove permissions for user
	    console.log("Remove permisions for user " + this.user_id);
	    self.permissions.remove(this);
	}
	
	self.fetchParticipantPermissions_off = function() 
	{
		var URI = VILFREDO_API + '/questions/' + question_id + '/permissions';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Question results returned...');
			self.permissions(data.permissions);
		});
	}
	
	// jazz
	self.fetchVotingResults = function() {
		var URI = VILFREDO_API + '/questions/' + question_id + '/results';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Question results returned...');
			self.results = data.results;
		});
	}
	
	self.fetchParticipationTable = function() {
		var URI = VILFREDO_API + '/questions/' + question_id + '/participation_table';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('participation table data returned...');
			self.participation_table(data.participation_table);
			self.num_proposals(data.num_proposals)
		});
	}
	// 
    // Participation Table colors and text
    //
    self.proposalsEvaluatedClass = function(evaluations) {
        if (evaluations == 0) return 'red';
        else if (evaluations == self.num_proposals()) return 'green';
        else return 'amber';
    }
    self.keyPlayerClass = function(key_player) {
        if (key_player) return 'red';
        else return 'green';
    }
    self.generationsParticipatedClass = function(generations) {
        if (generations == self.generation()) return 'amber';
        else if (generations == 0) return 'green';
        else return '';
    }
	self.proposalsEvaluatedText = function(evaluations) {
        return evaluations + '/' + self.num_proposals();
    }
    
	
	self.hasConfusedVotes = function(generation_id) {
	    if (typeof(self.voting_map()) == 'undefined') return;
	    return self.voting_map()[generation_id]['confused_count'] + self.voting_map()[generation_id]['oppose_count'];
    }
    
    self.alternateVotes = function(generation_id) {
	    if (typeof(self.voting_map()) == 'undefined' || typeof(generation_id)  == 'undefined') return;
	    return 'Generation ' + generation_id + ' has ' + self.voting_map()[generation_id]['confused_count'] + ' confused and ' + self.voting_map()[generation_id]['oppose_count'] + ' opposed votes';
    }
    
    self.proposalVoting = function(pid) {
	    if (
	        typeof(self.voting_map()) == 'undefined' || 
	        typeof(self.selected_generation()) == 'undefined' || 
	        typeof(pid) == 'undefined' || 
	        typeof(self.voting_map()[self.selected_generation()]['proposals'][pid]) == 'undefined' ||
	        typeof(self.voting_map()[self.selected_generation()]['proposals'][pid].votes) == 'undefined' ) 
	    {
	        return 'no data available for proposal ' + pid + ' in generation ' + self.selected_generation();
        }
	    
	    console.log('selected_generation = ' + self.selected_generation());
	    console.log('pid = ' + pid);
	    votes = self.voting_map()[self.selected_generation()]['proposals'][pid]['votes'];

	    title = '<strong>Proposal ' + pid + ':</strong><br><br> Endorsed by [' + votes['endorse'] + ']<br>';
	    title = title + 'Opposed by [' + votes['oppose'] + ']<br>';
	    title = title + 'Not understood by [' + votes['confused'] + ']';
	    return title;
    }
    
	
	self.allGenerations = ko.computed(function() {
        allgen = new Array();
        gen = 1;
        while (gen <= self.generation()) {
            allgen.push(gen);
            gen = gen + 1;
        }
        return allgen;
    });
    
    // Fetch voting map for all generaion of the question
    //
    self.fetchVotingMap = function() {
		var URI = VILFREDO_API + '/questions/' + question_id + '/voting_map';	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Voting Map data returned...');
			self.voting_map(data.voting_map);
		});
	}
    
    self.fetchTablesForSelectedAlgorithm = function(algorithm) {
        // Set the current generation for tables
        self.selected_algorithm(algorithm);

        // Fetch graph
        fetchGenerationGraph(self.selected_generation(), self.selected_algorithm())
        
        self.domination_map_array([]);
        self.fetchDominationMap(self.selected_algorithm());
		self.fetchLevelsMap(self.selected_algorithm());
    }
    
    self.fetchTablesForSelectedGeneration = function(generation_id) {
        // Set the current generation for tables
        self.selected_generation(generation_id);

        // Fetch graph
        fetchGenerationGraph(self.selected_generation(), self.selected_algorithm())
        
        self.domination_map_array([]);
        self.fetchDominationMap(self.selected_algorithm());
		self.fetchLevelsMap(self.selected_algorithm());
    }
    
    self.fetchTables = function(generation_id) {
        self.domination_map_array([]);
        self.selected_generation(generation_id);
        
        self.fetchDominationMap(self.dom_table_algorithm());
		self.fetchLevelsMap(self.levels_table_algorithm());
    }

	
	self.fetchLevelsMap = function(algorithm) {
		// Set the algorithm for the levels table
		self.levels_table_algorithm(algorithm);
		generation = self.selected_generation();
		self.levels_map();
		
		var URI = VILFREDO_API + '/questions/' + question_id + '/levels_map?' + 'generation=' + generation + '&algorithm=' + algorithm;	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Pareto Map data returned...');
			self.levels_map(data.levels_map);
		});
	}
	
	self.fetchDomMap = function(algorithm) {
	    // self.domination_map_array.removeAll();
	    console.log("fetchDomMap: using generation: " + self.selected_generation());
	    //alert('Parameter algorithm = ' + algorithm);
	    //alert(self.dom_table_algorithm());
	    console.log("fetchDomMap: using algorithm: " + self.dom_table_algorithm());
        self.fetchDominationMap(self.selected_generation(), algorithm);
    }
	
	self.fetchDominationMap = function(algorithm) {
		// Set the current domination table algorithm
		self.dom_table_algorithm(algorithm);
		
		// Reset the domination map
		self.domination_map_array([]);
		generation = self.selected_generation();
		
		var URI = VILFREDO_API + '/questions/' + question_id + '/domination_map?' + 'generation=' + generation + '&algorithm=' + algorithm;
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Domination Map data returned...');
			//self.domination_map(data.domination_map);
			for (var i = 0; i < data.domination_map.length; i++) {
			    self.domination_map_array.push(data.domination_map[i]);
		    }
		    //alert(self.dom_table_algorithm());
		});
	}
	
	self.fetchProposalRelations = function(generation, algorithm) {
		var URI = VILFREDO_API + '/questions/' + question_id + '/proposal_relations?' + 'generation=' + generation + '&algorithm=' + algorithm;	
		return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
		    console.log('Proposal Relation data returned...');
			console.log(data.proposal_relations);
			self.proposal_relations = data.proposal_relations;
		});
	}
	
	self.compareProposalVotes = function(pid1, pid2)
    {
        if (typeof(self.voting_map()) == 'undefined' || typeof(pid1) == 'undefined' || typeof(pid2) == 'undefined') 
	    {
	        return 'no data available';
        }
        
        pid1_votes = self.voting_map()[self.selected_generation()]['proposals'][pid1]['votes'];
        pid2_votes = self.voting_map()[self.selected_generation()]['proposals'][pid2]['votes'];
        
        pid1_endorse_diff = arrayDiff(pid1['endorse'], pid2['endorse']);
        pid1_oppose_diff = arrayDiff(pid1['oppose'], pid2['oppose']);
        pid1_confused_diff = arrayDiff(pid1['confused'], pid2['confused']);

        pid2_endorse_diff = arrayDiff(pid2['endorse'], pid1['endorse']);
        pid2_oppose_diff = arrayDiff(pid2['oppose'], pid1['oppose']);
        pid2_confused_diff = arrayDiff(pid2['confused'], pid1['confused']);
        
        title = '<strong>Proposal ' + pid + ':</strong><br><br> Endorsed by [' + votes['endorse'] + ']<br>';
	    title = title + 'Opposed by [' + votes['oppose'] + ']<br>';
	    title = title + 'Not understood by [' + votes['confused'] + ']';
	    
	    title = "<table><tr><th></th><th>Endorsed</th><th>Opposed</th><th>Confused</th></tr>";
	    
	    return title;
    }
	
	self.canMoveOn = ko.computed(function() {
	    var currentdate = new Date();
	    var currentSeconds = currentdate.getSeconds();
	    return self.minimum_time();
	});
	
	self.show_next_phase = function()
	{
	    if (self.phase() == 'writing')
	    {
	        return 'voting';
	    }
	    else
	    {
	        return 'writing';
	    }
	}

	self.minimum_time_passed = function()
	{
        return (get_timestamp() - self.last_move_on()) > self.minimum_time();
    }
    
    self.maximum_time_passed = function()
    {
        return (get_timestamp() - self.last_move_on()) > self.maximum_time();
	}
	
	self.userPermissions = function() // shark
	{
	    alert('here');
	    permissionsViewModel.open();
	}
	
	self.moveOn = function()
	{
	    console.log('moveOn called...');
	    //initPage();
	    //return;
	    ajaxRequest(VILFREDO_API + '/questions/' + question_id, 'PATCH', {move_on:true}).done(function(data) {
		    add_page_alert('success', 'Question now in ' + data.question.phase + ' phase');
		    console.log('Move on question data returned...');
			console.log(data);
			/*
    		self.phase(data.question.phase);
    		self.last_move_on(parseInt(data.question.last_move_on));
    		self.minimum_time(parseInt(data.question.minimum_time));
    		self.maximum_time(parseInt(data.question.maximum_time));
    		self.generation(data.question.generation);*/
    		initPage();
	    });
	}
	
	self.fetchQuestion = function()
	{
	    console.log('fetchQuestion called...');
	    return ajaxRequest(self.URI, 'GET').done(function(data) {
		    console.log('Question data returned...');
			console.log(data);
			self.id(data.question.id);
			self.title(data.question.title);
    		self.blurb(data.question.blurb);
    		self.author(data.question.author);
    		self.author_id(data.question.author_id);
    		self.phase(data.question.phase);
    		self.last_move_on(parseInt(data.question.last_move_on));
    		self.minimum_time(parseInt(data.question.minimum_time));
    		self.maximum_time(parseInt(data.question.maximum_time));
    		self.generation(parseInt(data.question.generation));
    		self.created = parseInt(data.question.created);
    		self.mapx = parseFloat(data.question.mapx);
    		self.mapy = parseFloat(data.question.mapy);
    		self.can_vote = data.question.can_vote;
    		self.can_propose = data.question.can_propose;
    		self.can_propose_ob(data.question.can_propose);
    		// User permissions will be set if user is question author
    		self.permissions(data.question.user_permissions);
    		self.proposal_count(parseInt(data.question.proposal_count))
	    });
	    
	    //
  		// Set selected generation to current generation if not already set
  		//
  		if (typeof(generation_id == 'undefined'))
  		{
  		    generation_id = parseInt(data.question.generation);
  		}
    }
}

function fetchGraph2(map_type, generation, algorithm)
{
	generation = generation !== undefined ? generation : questionViewModel.generation();
	map_type = map_type !== undefined ? map_type : DEFAULT_MAP_TYPE;
	algorithm = algorithm !== undefined ? algorithm : ALGORITHM_VERSION;
	
	var URI = VILFREDO_API + '/questions/'+ question_id +'/graph?generation=' + generation + '&map_type=' + map_type + '&algorithm=' + algorithm;
	
	return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
	    console.log('fetchGraph2 data returned...');
		console.log(data);
	});
}

function fetchGraph(map_type, generation, algorithm)
{
	generation = generation !== undefined ? generation : questionViewModel.generation();
	map_type = map_type !== undefined ? map_type : DEFAULT_MAP_TYPE;
	algorithm = algorithm !== undefined ? algorithm : ALGORITHM_VERSION;
	
	var URI = VILFREDO_API + '/questions/'+ question_id +'/graph?generation=' + generation + '&map_type=' + map_type + '&algorithm=' + algorithm;

	return ajaxRequest(URI, 'GET').done(function(data, textStatus, jqXHR) {
	    console.log('fetchGraph data returned...');
		console.log(data);
	});
}

function fetchGraphs(algorithm, generation)
{
    console.log("fetchGraphs called...")
    generation = generation !== undefined ? generation : questionViewModel.generation();
    algorithm = algorithm !== undefined ? algorithm : ALGORITHM_VERSION;
    phase = questionViewModel.phase();
    if (phase == 'writing' && generation > 1 && generation == questionViewModel.generation())
    {
        fetchWritingGraph(generation, algorithm);
    }
    else if (phase == 'voting')
    {
        fetchVotingGraphs(generation, algorithm);
    }
}

function fetchWritingGraph(generation, algorithm)
{
	console.log("fetchWritingGraphs called...")
	generation = generation !== undefined ? generation : questionViewModel.generation();
	algorithm = algorithm !== undefined ? algorithm : ALGORITHM_VERSION;
	$.when(fetchGraph('pareto', generation-1, algorithm)).done(function( graph_resp )
	{
		//if (typeof graph_resp[2].status !== 'undefined' && graph_resp[2].status == 204)
		if (false)
		{
		    $('.voting-graphs').hide();
		    console.log('fetchWritingGraphs: No endorsememnts yet');
		}
		else
		{
		    $('.voting-graphs').show();
			// a1 and a2 are arguments resolved for the page1 and page2 ajax requests, respectively.
			// Each argument is an array with the following structure: [ data, statusText, jqXHR ]
			console.log( "Pareto graph URL = " + graph_resp['url'] );
			pfvotesgraph = graph_resp['url'];
			//loadGraphs(null, pfvotesgraph);
			loadSingleGraph(pfvotesgraph);
		}
	}).fail(function(jqXHR) 
	{
		console.log('fetchWritingGraphs: There was an error fetching the graphs. Error ' + jqXHR.status);
    });
}

function fetchGenerationGraph(generation, algorithm) // jazz
{
	console.log("fetchGenerationGraph called...");
	console.log("Fetching GenerationGraph called with algorithm " + algorithm);
	generation = generation !== undefined ? generation : questionViewModel.generation();
	algorithm = algorithm !== undefined ? algorithm : ALGORITHM_VERSION;
	console.log("Fetching GenerationGraph for genration " + generation + ' using alg ' + algorithm);
    
    console.log("Fetching GenerationGraph for genration " + generation);
    //$.when(fetchGraph2('all', generation, algorithm)).done(function( all )
    $.when(fetchGraph('all', generation, algorithm)).done(function( all )
	{
	    $('.voting-graphs').show();
	    // a1 and a2 are arguments resolved for the page1 and page2 ajax requests, respectively.
		// Each argument is an array with the following structure: [ data, statusText, jqXHR ]
		//console.log( "Generation graph URL = " + all[0]['url'] );
		gengraph = all['url'];
		console.log("Loading gengraph " + gengraph);
		loadSingleGraph(gengraph);
	}).fail(function(jqXHR) 
	{
		console.log('fetchGenerationGraph: There was an error fetching the graph. Error ' + jqXHR.status);
    });
}

function fetchVotingGraph(generation, algorithm)
{
	console.log("fetchVotingGraph called...");
	generation = generation !== undefined ? generation : questionViewModel.generation();
	algorithm = algorithm !== undefined ? algorithm : ALGORITHM_VERSION;
	
	$.when(fetchGraph('all', generation, algorithm)).done(function( all )
	{
	    $('.voting-graphs').show();
	    // a1 and a2 are arguments resolved for the page1 and page2 ajax requests, respectively.
		// Each argument is an array with the following structure: [ data, statusText, jqXHR ]
		votesgraph = all['url'];
		console.log("Loading votesgraph " + votesgraph);
		loadSingleGraph(votesgraph);
	}).fail(function(jqXHR) 
	{
		console.log('fetchVotingGraph: There was an error fetching the graphs. Error ' + jqXHR.status);
    });
}
function fetchVotingGraphs(generation, algorithm)
{
	console.log("fetchVotingGraphs called...");
	generation = generation !== undefined ? generation : questionViewModel.generation();
	algorithm = algorithm !== undefined ? algorithm : questionViewModel.selected_algorithm();
	
	if (algorithm > 1)
	{
	    return fetchVotingGraph(generation, algorithm);
	}
	
	$.when(fetchGraph('all', generation, algorithm), fetchGraph('pareto', generation, algorithm)).done(function( all, pareto )
	{
		if (all[2].status == 204)
		{
		    $('.voting-graphs').hide();
		    console.log('fetchVotingGraphs: No endorsememnts yet');
		}
		else
		{
		    $('.voting-graphs').show();
		    // a1 and a2 are arguments resolved for the page1 and page2 ajax requests, respectively.
			// Each argument is an array with the following structure: [ data, statusText, jqXHR ]
			console.log( "All votes graph URL = " + all[0]['url'] );
			console.log( "Pareto graph URL = " + pareto[0]['url'] );
			votesgraph = all[0]['url'];
			pfvotesgraph = pareto[0]['url'];
			loadGraphs(votesgraph, pfvotesgraph);
		}
	}).fail(function(jqXHR) 
	{
		console.log('fetchVotingGraphs: There was an error fetching the graphs. Error ' + jqXHR.status);
    });
}

var ajaxRequest = function(uri, method, data) {
	console.log('ajaxRequest: request made... ' + uri);
	var request = {
		url: uri,
        type: method,
        contentType: "application/json",
        accepts: "application/json",
        cache: false,
        dataType: 'json',
        data: JSON.stringify(data),
        beforeSend: function (xhr) {
			if (currentUserViewModel.authToken != '')
			{
				console.log("Use the auth token " + currentUserViewModel.authToken);
				xhr.setRequestHeader('Authorization',
					"Basic " + btoa(currentUserViewModel.authToken + ":" + ''));
			}
			else if (currentUserViewModel.username() != '' && currentUserViewModel.password != '')
			{
				console.log("Use login details");
				xhr.setRequestHeader("Authorization", 
                	"Basic " + btoa(currentUserViewModel.username() + ":" + currentUserViewModel.password));
			}
        },
        error: function(jqXHR) {
            console.log("ajax error " + jqXHR.status);
        }
     };
     return $.ajax(request);
}
var ajaxRequest_xd = function(uri, method) {
	console.log('ajaxRequest: request made... ' + uri);
    var request = {
		url: uri,
        type: method,
        crossDomain: true,
        contentType: "application/json",
        accepts: "application/json",
        cache: false,
        dataType: 'jsonp',
        //data: JSON.stringify(data),
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", 
                "Basic " + btoa(self.username + ":" + self.password));
        },
        error: function(jqXHR) {
            console.log("ajax error " + jqXHR.status);
        }
     };
     return $.ajax(request);
   }
  
var enterShow = function() {
    console.log('enterShow')
	$(this).popover('show');
};

var exitHide = function() {
    $(this).popover('hide');
}
