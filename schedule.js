fs = require('fs')
math = require('mathjs')
R = require('ramda')

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

function readSessions(){
    fs.readFile('sessions.dat', 'utf8', function (err,data) {
        var lines = data.split("\n");
        lines.shift();
        lines.forEach(function(line) {
            session = line.split(" ");
            sessions.push(session)
        });

        setupDataStructures();
        bruteforce();

    });
}

function setupDataStructures(){
    var size = sessions.length + 1;
    overLapCost = math.zeros(size, size).valueOf();

    setupSessionIndexes();
    calculateCollisionCosts();
}

function bruteforce() {
    var bestScore = 999999;
    var schedule = undefined;

    for (iterations = 0; iterations < 10000; iterations++){
        schedule = getRndSchedule();

        var improving = true;
        while(improving){
            improving = false;
            for(loop = 0; loop < nPTracks; loop++) {
                tmp = schedule.clone();
                //scrambleColumn(Math.floor(Math.random() * schedule[0].length), tmp);
                optimizeColumn(loop, tmp);
                tmpScore = evalSchedule(tmp);
                if(tmpScore < bestScore) {
                    bestScore = tmpScore;
                    console.log("current score:", bestScore);
                    schedule = tmp;
                    improving = true;
                    console.log("Iterations:",iterations);
                    console.log("Best score:", bestScore);
                    console.log("--- best schedule ---\n", schedule);
                }
            }
        }
    }
    console.log("DONE");
}

Array.prototype.clone = function(){
    return this.map(e => Array.isArray(e) ? e.clone() : e);
};

function setupSessionIndexes(){
    sSlotsI[0] = 1;
    for(i=0; i < sessions.length;i++){
        sNameI[sessions[i][0]] = i+1;
        sSlotsI[i+1] = parseInt(sessions[i][1]);
    }
    console.log("sNameI\n", sNameI);
    console.log("sSlotsI\n", sSlotsI);
}

function calculateCollisionCosts(){
    votes.forEach(function(vote, index, array) {
        v1 = vote[0];
        v2 = vote[1];
        sNameI1 = sNameI[v1];
        sNameI2 = sNameI[v2];
        overLapCost[sNameI1][sNameI2] += 1;
        overLapCost[sNameI2][sNameI1] += 1;
    });
}

// baka om schedule till en lista av listor med [ses#, slot_cost], summera slot_cost och om större än nSlots så är det ett ogiltigt schedule, ha en separat sum lista som vi gör + & - i för ev speedup senare.
function fixedSchedule1(){
    schedule = [
        [ 4, 5, 2, 1, 9],
        [ 4, 5, 2,14, 9],
        [ 4, 0, 0,14, 6],
        [11,10, 3, 7, 0],
        [11,10, 3, 7,12],
        [11,10, 3, 0,12],
        [ 0, 8, 0, 0,13]
    ];
    return schedule;
}

function fixedSchedule2(){
    schedule = [
        [ 1, 4, 7,10,12],
        [ 2, 4, 7,10,12],
        [ 2, 4, 8,10,13],
        [ 3, 5, 9,11,14],
        [ 3, 5, 9,11,14],
        [ 3, 6, 0,11, 0],
        [ 0, 0, 0, 0, 0]
    ];
    return schedule;
}

function getRndSchedule(){
    var sessionList = R.clone(sSlotsI);
    var schedule = math.zeros(nSlots, nPTracks).valueOf();
    var values = Object.keys(sessionList).map(function(key){
        return sessionList[key];
    });
    var keys = Object.keys(sessionList).map(function(key){
        return parseInt(key);
    });
    var scheduleTrack = 0;
    var currentRow = 0;
    var scheduleRow = [];
   
    while (keys.length > 0) {
        while(true){
            var rnd = Math.floor(Math.random() * keys.length);
            var key = keys[rnd];
            var value = values[key];
            if (scheduleRow.length + values[key] <= nSlots ) {
                for (i = 0; i < values[key]; i++) {
                    scheduleRow.push(key);
                }

                if(keys.length > 1){
                    keys.splice(rnd, 1);
                } else {
                    keys = [];
                }
            } else {
                break;
            }
        }
        for (i = 0; i < scheduleRow.length; i++) {
            schedule[i][currentRow] = scheduleRow[i];
        }
        scheduleRow = [];
        currentRow++;

    }

    return schedule;
}

function evalSchedule(schedule) {
    size = sessions.length;
    cost = math.zeros(nSlots, nPTracks+1).valueOf();
    totalCost = 0;
    for (i = 0; i < nSlots; i++) {
        rowSum = 0;
        for (j = 0; j < nPTracks; j++) {
            for (k = j + 1; k < nPTracks; k++) {
                ss1 = schedule[i][j];
                ss2 = schedule[i][k];
                if (ss1 != undefined && ss2 != undefined) {
                    cost[i][j] += overLapCost[ss1][ss2];
                }
            }
            rowSum += cost[i][j];
        }
        cost[i][nPTracks] = rowSum;
        totalCost += rowSum;
    }
    return totalCost;
}

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
    for(i = 0; i < schedule.length; i++) {
        if(i < scrambledList.length){
            schedule[i][column] = scrambledList[i];
        } else {
            schedule[i][column] = 0;
        }
    }

}

// TODO kolla om alla permiutationer kommer med, såg ut som vi missar i början.
function optimizeColumn(column, schedule) {
    var list = [];
    var tmp = -1;
    for(i = 0; i < schedule.length; i++) {
        if(schedule[i][column] != tmp && schedule[i][column] != undefined) {
            tmp = schedule[i][column];
            list.push(tmp);
        }
    }

    var current = PermutationGenerator.getStartSequence(list);
    while (true) {
        if (current == null) { break; }
        var currentExpanded= [];
        for(i = 0; i < current.length; i++) {
            for(j = 0; j < sSlotsI[current[i]]; j++) {
                currentExpanded.push(current[i]);
            }
        }
        for(i = 0; i < schedule.length; i++) {
            schedule[i][column] = currentExpanded[i];
        }
        current = PermutationGenerator.getNextSequence(current);
    }
}

var PermutationGenerator = (function () {
    var self = {};
    self.getStartSequence = function (list) {
        return list.slice(0).sort();
    };
    self.getNextSequence = function (list) {
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




