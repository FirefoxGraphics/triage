/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var BIG_SCREEN = "bigscreen";
var SMALL_SCREEN = "smallscreen";

var BUGZILLA_URL;
var BUGZILLA_REST_URL;
var CALENDAR_URL;
var bugQueries;

// Not worth chasing toLocaleDateString etc. compatibility
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

$(document).ready(function () {
  $.getJSON('js/triage.json', function(data) {
    main(data);
  });
});

function main(json)
{
  var now = new Date();
  var currentYear = now.getFullYear();

  $("#subtitle").replaceWith("<div id=\"subtitle\" class=\"subtitle\">Incoming Bug Triage</div>");
  
  var triage = json.triage;
  BUGZILLA_URL = triage.BUGZILLA_URL;
  BUGZILLA_REST_URL = triage.BUGZILLA_REST_URL;
  CALENDAR_URL = triage.CALENDAR_URL;

  $.ajax({
    url: CALENDAR_URL,
    crossDomain:true,
    crossOrigin:true,
    success: function(data) {
      var icsBugQueries = parseICS(data);
      var display = getDisplay();
      var year = getYear(now);
    
      bugQueries = icsBugQueries[year];
      var future = $.url().param('future');
      var count = setupQueryURLs(triage.basequery, triage.old_basequery,future);
    
      var displayType = (future ? "future" : (year==currentYear ? "current" : "past"));
    
      displayTitle(year, count, displayType);
      displaySchedule(year);
      displayYearFooter(currentYear, displayType, icsBugQueries);
    
      getBugCounts();
    }
    });
}

function parseICS(icsdata) {
  var icsBugQueries = {};

  // Download calendar and parse into bugqueries.
  var ics = ical.parseICS(icsdata);
  for (let k in ics) {
    if (ics.hasOwnProperty(k)) {
      var ev = ics[k];
      if (ics[k].type == 'VEVENT') {
        // console.log(`${ev.summary} is in ${ev.location} on the ${ev.start.getDate()} of ${MONTHS[ev.start.getMonth()]} at ${ev.start.getFullYear()}`);
        var event_regex = /\[.*\] (.*)/g;
        var eventMatch = event_regex.exec(ev.summary);
        if (!eventMatch) {
          // console.log('Incorrect summary syntax');
          continue; // Incorrect event syntax, ignore.
        }

        var who = eventMatch[1];
        var startDate = `${ev.start.getFullYear()}-${ev.start.getMonth() + 1}-${ev.start.getDate()}`;
        var endDate = `${ev.end.getFullYear()}-${ev.end.getMonth() + 1}-${ev.end.getDate()}`;
        var year = `${ev.start.getFullYear()}`;
        var endyear = `${ev.end.getFullYear()}`;


        if (!icsBugQueries[year])
          icsBugQueries[year] = [];

        if (!icsBugQueries[endyear])
          icsBugQueries[endyear] = [];

        icsBugQueries[year].push({
          "who": who,
          "from": startDate,
          "to": endDate
        });

        if (year != endyear) {
          icsBugQueries[endyear].push({
            "who": who,
            "from": startDate,
            "to": endDate
          });
        }

      }
    }
  }

  // Sort
  for (yearKey in icsBugQueries) {
    icsBugQueries[yearKey].sort(
      function(a, b){
         return new Date(a.from) > new Date(b.from);
      });
  }

  return icsBugQueries;
}

function getYear(now)
{
  var year = $.url().param('year');
  if (year) {
    if (parseInt(year)) {
      return year;
    }
  }
  return "" + now.getFullYear();
}

function getDisplay()
{
  var display = $.url().param('display');
  if (display && (display === BIG_SCREEN)) {
    return BIG_SCREEN;
  }
  return SMALL_SCREEN;
}

function displayTitle(year, count, displayType)
{
  $("#title").append(" " + year);
  $("#header-bg").attr("class", "header-bg header-bg-" + displayType);
  if (displayType != "current") {
    $("#title").attr("class", "title-light");
    $("#subtitle").attr("class", "subtitle title-light");
  }

  var content = "";
  if (bugQueries) {
    //if (displayType == 'future') {
    for (var i = 0; i < count; i++) {
      content += "<div class=\"bugcount\" id=\"reportDiv" + year + "-" + i + "\"></div>\n";
    }
    //for (var i = count - 1; i >= 0; i--) {
    //  content += "<div class=\"bugcount\" id=\"reportDiv" + year + "-" + i + "\"></div>\n";
    //}
    $("#content").replaceWith(content);
  }
}

function displaySchedule(year)
{
  if (!bugQueries) {
    return;
  }

  for (var i = 0; i < bugQueries.length; i++) {
    var query = bugQueries[i];
    if (!("url" in query)) {
      continue;
    }
    var dfrom = query.from.split('-');
    var dto = query.to.split('-');
    var id = year + "-" + i;

    $("#reportDiv" + id).replaceWith("<div class=\"bugcount\"><h3>"
                                  + query.who
                                  + "</h3>"
                                  + "<h5>("
                                  + MONTHS[dfrom[1]-1] + " " + dfrom[2] + " - "
                                  + MONTHS[dto[1]-1] + " " + dto[2] + ")</h5>"
                                  + "<div id=\"data" + i + "\""
                                  + " class=\"data greyedout\">?</div></div>");
  }
}

function displayYearFooter(currentYear, displayType, icsBugQueries)
{
  var footer = "<br><br><br><br><div id=\"footer\" class=\"footer-" + displayType + "\">Year &gt; ";
  var nextYear = currentYear + 1;

  // If the ics file has dates for future years. Generally shouldn't show up unless you're
  // near the end of the year and the generation script ran into the new year.
  if (("" + nextYear) in icsBugQueries) {
    footer += "<a href=\"?year=" + (nextYear) + "&future=1\">" + (nextYear) + "</a> | ";
  }

  // The future schedule
  footer += "<a href=\"?year=" + currentYear + "&future=1\">Schedule</a>";

  for (var year = currentYear; year >= 2020; year--) {
    footer += "<a href=\"?year=" + year + "\">" + year + "</a> | ";
  }
  footer += "</div>";
  $("#body").append(footer);
}

function setupQueryURLs(url, old_url, seeall)
{
  if (!bugQueries) {
    return 0;
  }
  // Do not show results for dates that are too close to today.  Only once we
  // are five days after the end of the term...
  var cutoff = new Date();
  var oldquery_stopdate = new Date("2020-5-2");
  for (var i = 0; i < bugQueries.length; i++) {
    if (!seeall) {
      var dto = new Date(bugQueries[i].from);
      if (cutoff < dto) {
        return i;
      }
    }

    var date_query_to = new Date(bugQueries[i].to);
    if (oldquery_stopdate >= date_query_to) {
      bugQueries[i]["url"] = old_url.replace(/<FROM>/g, bugQueries[i].from).replace(/<TO>/g, bugQueries[i].to);
    }
    else {
      bugQueries[i]["url"] = url.replace(/<FROM>/g, bugQueries[i].from).replace(/<TO>/g, bugQueries[i].to);
    }
  }
  return bugQueries.length;
}

function getBugCounts()
{
  if (!bugQueries) {
    return;
  }
  for (var i = bugQueries.length-1; i >= 0; i--) {
    var bugQuery = bugQueries[i];
    if (!("url" in bugQuery)) {
      continue;
    }
    $.ajax({
      url: BUGZILLA_REST_URL + bugQuery.url + '&count_only=1',
      bugQuery: bugQuery,
      index: i,
      crossDomain:true,
      dataType: 'json',
      ifModified: true,
      success: function(data, status) {
        if (status === 'success') {
          this.bugQuery.count = data.bug_count;
          displayCount(this.index, this.bugQuery.count,
                       BUGZILLA_URL + this.bugQuery.url);
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(textStatus);
      }
    });
  }
}

function displayCount(index, count, url)
{
  if (count == 0)
    count = '&nbsp;';
  $("#data" + index).replaceWith("<div class=\"data\"><a href=\"" + url
                                 + "\">" + count + "</a></div>" );
}
