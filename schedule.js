fs = require('fs')
math = require('mathjs')

var votes=[];
var sessions=[];
var sNameI = {};
var sSlotsI = {};
var overLapCost = [];

var nPTracks = 5;
var nSlots = 7;

readVotes();

function readVotes(){
    fs.readFile('randomized_votes.dat', 'utf8', function (err,data) {
        var lines = data.split("\n");
        lines = lines.slice(1,-1)
        lines.forEach(function(line) {
            vote = line.split(" ");
            v1 = vote.slice(1,-2)
            votes.push(v1)
            v2 = vote.slice(2,-1)
            votes.push(v2)
        });
        //console.log("votes", votes);
        readSessions();
    });
}

//function optimize

function readSessions(){
    fs.readFile('sessions.dat', 'utf8', function (err,data) {
        var lines = data.split("\n");
        lines.shift();
        lines.forEach(function(line) {
            session = line.split(" ");
            sessions.push(session)
        });
        size = sessions.length;
        overLapCost = math.zeros(size, size).valueOf();

        setupSessionIndexes();
        calculateCollisionCosts();

        schedule = generateRndSchedule1();

        bestScore = evalSchedule(schedule);
        console.log("start score\n", bestScore);

        for(a = 0; a < 1000; a++) {
            tmp = schedule.clone();
            //console.log("------\n--- schedule ---\n", schedule, "\n--- TMP ---\n", tmp);
            scrambleColumn(Math.floor(Math.random() * schedule[0].length), tmp);
            tmpScore = evalSchedule(tmp);
            if(tmpScore < bestScore) {
                bestScore = tmpScore;
                console.log("current best score\n", bestScore);
                schedule = tmp;
                console.log(tmpScore);
            }
        }
        console.log("a",a);
        console.log("--- schedule ---\n", schedule);
    });
}

Array.prototype.clone = function(){
  return this.map(e => Array.isArray(e) ? e.clone() : e);
};

function copy(array) {
  return array.map(function(arr) {
    return arr.slice();
  });
}

function setupSessionIndexes(){
    for(i=0; i < sessions.length;i++){
        sNameI[sessions[i][0]] = i;
        sSlotsI[i] = sessions[i][1];
    }
    console.log("sNameI\n", sNameI);
    console.log("sSlotsI\n", sSlotsI);
}

function calculateCollisionCosts(){
    votes.forEach(function(vote, index, array) {
        //if(index > 10) return;
        v1 = vote[0];
        v2 = vote[1];
        sNameI1 = sNameI[v1];
        sNameI2 = sNameI[v2];
        //console.log("v1 ", v1, "v2 ", v2, "    sNameI1", sNameI1, "sNameI2", sNameI2);
        overLapCost[sNameI1][sNameI2] += 1;
        overLapCost[sNameI2][sNameI1] += 1;
    });
    console.log("overLapCost\n", overLapCost);
}
// baka om schedule till en lista av listor med [ses#, slot_cost], summera slot_cost och om större än nSlots så är det ett ogiltigt schedule, ha en separat sum lista som vi gör + & - i för ev speedup senare.
function generateRndSchedule1(){
    schedule = [
        [2,3,9,10,11],
        [2,3,9,10,11],
        [2,3,9,10,0],
        [13,4,6,8,1],
        [13,4,6,8,1],
        [7,12,,,5],
        [,,,,,]
    ];
    return schedule;
}

function evalSchedule(schedule) {
    size = sessions.length;
    cost = math.zeros(nSlots, nPTracks).valueOf();
    totalCost = 0;
    for(i = 0; i < nSlots; i++) {
        rowSum = 0;
        for(j = 0; j < nPTracks; j++) {
            for(k = j + 1; k < nPTracks; k++) {
                //console.log("j k\n", j, k);
                ss1 = schedule[i][j];
                ss2 = schedule[i][k];
                if(ss1 != undefined && ss2 != undefined) {
                    //console.log("ss\n", ss1, ss2);
                    cost[i][j] += overLapCost[ss1][ss2];
                }
            }
            rowSum += cost[i][j];
        }
        cost[i][nPTracks - 1] = rowSum;
        totalCost += rowSum;
    }
    //console.log("--- cost ---\n", cost);
    return totalCost;
}
var asdf = [,];
function scrambleColumn(column, schedule) {
    list = [];
    current = -1;
    for(i = 0; i < schedule.length; i++) {
        if(schedule[i][column] != current && schedule[i][column] != undefined) {
            current = schedule[i][column];
            list.push(current);
        }
    }
    scrambledList = [];
    while(list.length > 0) {
        r = Math.floor(Math.random() * list.length);
        e = list[r];
        list.splice(r, 1);
        for(i = 0; i < sSlotsI[e]; i++) {
            scrambledList.push(e);
        }
    }
    for(i = 0; i < scrambledList.length; i++) {
        schedule[i][column] = scrambledList[i];
    }
}



var PermutationGenerator = (function () {
    var self = {};

    self.getStartSequence = function (list) {
        return list.slice(0).sort();
    };

    self.getNextSequence = function (list) {
        // Make clone
        var a = list.slice(0);
        var k = -1;
        for (var i = 0; i < a.length - 1; ++i) {
            if (a[i] < a[i + 1]) { k = i; }
        }
        if (k == -1) return null; 
        var l = -1;
        for (var i = 0; i < a.length; ++i) {
            if (a[k] < a[i]) { l = i };
        }
        if (l == -1) return null; 
        var tmp = a[k]; a[k] = a[l]; a[l] = tmp;
        var next = a.slice(0, k + 1).concat(a.slice(k + 1).reverse());
        return next;
    };

    return self;
} ());




