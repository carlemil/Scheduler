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
        console.log("votes", votes);
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
        size = sessions.length;
        overLapCost = math.zeros(size, size).valueOf();

        setupSessionIndexes();
        calculateCollisionCosts();

        schedule1 = generateRndSchedule1();
        schedule2 = generateRndSchedule2();
        console.log("score1\n", evalSchedule(schedule1));
        console.log("score2\n", evalSchedule(schedule2));
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
        [13,4,6,8,5],
        [7,12,,,],
        [,,,,]
    ];
    return schedule;
}

function generateRndSchedule2(){
    schedule = [
        [2,3,9,10,1],
        [2,3,9,10,5],
        [2,3,9,10,11],
        [13,4,6,8,11],
        [13,4,6,8,0],
        [7,12,,,],
        [,,,,]
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
    console.log("cost\n", cost);
    return totalCost;
}











