/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var BIG_SCREEN = "bigscreen";
var SMALL_SCREEN = "smallscreen";

var BUGZILLA_URL;
var BUGZILLA_REST_URL;
var bugQueries;

$(document).ready(function () {
  $.getJSON('js/triage.json', function(data) {
    main(data);
  });
});

function main(triage) {
  BUGZILLA_URL = triage.BUGZILLA_URL;
  BUGZILLA_REST_URL = triage.BUGZILLA_REST_URL;
  bugQueries = triage.bugQueries;

  var display = getDisplay();

  displayTitle("2016");
  displaySchedule("2016");

  updateQueryURLs(triage.basequery);

  var dummy = "dummy";
  getBugCounts();

  // Update counts periodically
//  window.setInterval(getBugCounts, triage.refreshHours * 60 * 60 * 1000);
}

function getDisplay() {
  var display = $.url().param('display');
  if (display && (display === BIG_SCREEN)) {
    return BIG_SCREEN;
  }
  return SMALL_SCREEN;
}

function displayTitle(year) {
  $("#header-bg").attr("class", "header-bg header-bg-" + "release");
  var content = "";
  for (var i = bugQueries.length-1; i>=0; i--) {
    content += "<div class=\"bugcount\" id=\"reportDiv" + year + "-" + i + "\"></div>\n";
  }
  $("#content").replaceWith(content);
}

function displaySchedule(year) {
  for (var i = 0; i < bugQueries.length; i++) {
    var query = bugQueries[i];
    var dfrom = new Date(query.from.split('-'));
    var dto = new Date(query.to.split('-'));
    var id = year + "-" + i;
    $("#reportDiv" + id).replaceWith("<div class=\"bugcount\"><h3>"
                                  + query.who
                                  + "</h3>"
                                  + "<h5>("
                                  + dto.getFullYear() + ": "
                                  + dfrom.toLocaleFormat("%b %e") + " to "
                                  + dto.toLocaleFormat("%b %e") + ")</h5>"
                                  + "<div id=\"data" + i + "\""
                                  + " class=\"data greyedout\">?</div></div>");
  }
}

function updateQueryURLs(url) {
  for (var i = 0; i < bugQueries.length; i++) {
    bugQueries[i]["url"] = url + "&chfieldfrom=" + bugQueries[i].from + "&chfieldto=" + bugQueries[i].to;
  }
}

function getBugCounts() {
  for (var i = 0; i < bugQueries.length; i++) {
    var bugQuery = bugQueries[i];
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
        alert(textStatus);
      }
    });
  }
}

function displayCount(index, count, url) {
  $("#data" + index).replaceWith("<div class=\"data\"><a href=\"" + url
                                 + "\">" + count + "</a></div>" );
}
