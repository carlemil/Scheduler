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

//function optimize

function readSessions(){
    fs.readFile('sessions.dat', 'utf8', function (err,data) {
        var lines = data.split("\n");
        lines.shift();
        lines.forEach(function(line) {
            session = line.split(" ");
            sessions.push(session)
        });
        var size = sessions.length + 1;
        overLapCost = math.zeros(size, size).valueOf();

        setupSessionIndexes();
        calculateCollisionCosts();

        //var schedule = fixedSchedule2();
        var schedule = getRndSchedule();

        //generateRndSchedule();
        console.log("--- initial schedule ---\n", schedule);

        return;

        bestScore = evalSchedule(schedule);
        //console.log("start score\n", bestScore);
        var iterations = 0;
        var improving = true;
        while(improving){
            improving = false;
            for(loop = 2; loop < 3; loop++) {//nPTracks; loop++) {
                tmp = schedule.clone();
                //scrambleColumn(Math.floor(Math.random() * schedule[0].length), tmp);
                optimizeColumn(loop, tmp);
                tmpScore = evalSchedule(tmp);
                if(tmpScore < bestScore) {
                    bestScore = tmpScore;
                    console.log("current score:", bestScore);
                    console.log("--- current schedule ---\n", schedule);
                    schedule = tmp;
                    //improving = true;
                }
            }
            iterations++;
        }
        console.log("Iterations:",iterations);
        console.log("Best score:", bestScore);
        console.log("--- best schedule ---\n", schedule);
    });
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
        //console.log("v1 ", v1, "v2 ", v2, "    sNameI1", sNameI1, "sNameI2", sNameI2);
        overLapCost[sNameI1][sNameI2] += 1;
        overLapCost[sNameI2][sNameI1] += 1;
    });
    //console.log("overLapCost\n", overLapCost);
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
    console.log("sessionList:\n", sessionList);
    var scheduleRow = [];
   
    while (keys.length > 0) {
        var rnd = Math.floor(Math.random() * keys.length);
        var key = keys[rnd];
        var value = values[key];

        if(keys.length > 1){
            keys.splice(rnd, 1);
        } else {
            keys = [];
        }
        console.log("keys", keys);
        console.log("values", values);
        console.log("key", key);
        console.log("rnd", rnd);

        if (scheduleRow.length + values[key] <= nSlots ) {
            for (i = 0; i < values[key]; i++) {
                scheduleRow.push(key);
            }
            console.log("scheduleRow: ", scheduleRow, scheduleRow.length);
        } else {
            console.log("---------------");
            console.log("scheduleRow.length: ", scheduleRow.length, "schedule.length", schedule.length);
            //for (i = scheduleRow.length; i < schedule.length; i++) {
            //    scheduleRow.push(0);
            //}
            for (i = 0; i < scheduleRow.length; i++) {
                schedule[i][currentRow] = scheduleRow[i];
            }
            scheduleRow = [];
            for (i = 0; i < values[key]; i++) {
                scheduleRow.push(key);
            }
            currentRow++;
            console.log("schedule:\n", schedule, currentRow,"\n------\n");
        }
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
                //console.log("i ",i," j ",j," k ", k);
                //console.log("schedule\n", schedule);
                ss1 = schedule[i][j];
                ss2 = schedule[i][k];
                if (ss1 != undefined && ss2 != undefined) {
                    //console.log("ss\n", ss1, ss2, i, j, k, overLapCost[ss1][ss2]);
                    cost[i][j] += overLapCost[ss1][ss2];
                }
            }
            rowSum += cost[i][j];
        }
        cost[i][nPTracks] = rowSum;
        totalCost += rowSum;
    }
    //console.log("--- totalCost ---\n", totalCost, "\n", cost);
    return totalCost;
}

function scrambleColumn(column, schedule) {
    list = [];
    current = -1;
//console.log("---1schedule\n",column, schedule);
    for(i = 0; i < schedule.length; i++) {
        if(schedule[i][column] != current && schedule[i][column] != undefined) {
            current = schedule[i][column];
            list.push(current);
        }
    }
//console.log("---2schedule\n", schedule);
    scrambledList = [];
    while(list.length > 0) {
        r = Math.floor(Math.random() * list.length);
        e = list[r];
        list.splice(r, 1);
        for(i = 0; i < sSlotsI[e]; i++) {
            scrambledList.push(e);
        }
    }
//console.log("---3schedule\n", schedule);
//console.log("schedule", schedule);
//console.log("scrambledList",scrambledList);
//console.log("column",column);
    for(i = 0; i < schedule.length; i++) {
        if(i < scrambledList.length){
            schedule[i][column] = scrambledList[i];
        } else {
            schedule[i][column] = 0;
        }
    }
//console.log("---4schedule\n", schedule);
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
    //console.log('list', list);
    var current = PermutationGenerator.getStartSequence(list);
    //var count = 1;
    //console.log('start = ' + current);
    while (true) {
        
        if (current == null) { break; }
        //console.log('next' + (++count) + ' = ' + current);
    
        var currentExpanded= [];
        for(i = 0; i < current.length; i++) {
        //console.log("sSlotsI[i] ", i, sSlotsI[i], current[i]);
            for(j = 0; j < sSlotsI[current[i]]; j++) {
                currentExpanded.push(current[i]);
            }
        }
        //console.log("currentExpanded ", currentExpanded);
        //console.log("---1 schedule\n", schedule);
        for(i = 0; i < schedule.length; i++) {
            schedule[i][column] = currentExpanded[i];
        }
        //console.log("---2 schedule\n", schedule);
        current = PermutationGenerator.getNextSequence(current);
        //console.log("optimized schedule\n", schedule);
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




