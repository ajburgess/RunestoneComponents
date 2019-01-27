/*==========================================
=======     Master dragndrop.js     ========
============================================
===     This file contains the JS for    ===
=== the Runestone Drag n drop component. ===
============================================
===              Created by              ===
===           Isaiah Mayerchak           ===
===                7/6/15                ===
==========================================*/

var ddList = {};    // Dictionary that contains all instances of dragndrop objects


function DragNDrop (opts) {
    if (opts) {
        this.init(opts);
    }
}

DragNDrop.prototype = new RunestoneBase();

/*========================================
== Initialize basic DragNDrop attributes ==
========================================*/
DragNDrop.prototype.init = function (opts) {
    RunestoneBase.apply(this, arguments);
    var orig = opts.orig;    // entire <ul> element that will be replaced by new HTML
    this.origElem = orig;
    this.divid = orig.id;
    this.useRunestoneServices = opts.useRunestoneServices;
    this.random = false;
    if ($(this.origElem).is("[data-random]")) {
        this.random = true;
    }
    this.feedback = "";
    this.dragPairArray = [];
    this.question = "";
    this.orientation = "";
    this.populate();   // Populates this.dragPairArray, this.feedback and this.question

    this.createNewElements();
};
/*======================
=== Update variables ===
======================*/

DragNDrop.prototype.populate = function () {
    var tmp2 = [];
    for (var i = 0; i < this.origElem.childNodes.length; i++) {
        if ($(this.origElem.childNodes[i]).data("component") === "draggable") {

            var dragElem = this.origElem.childNodes[i];
            var dropElem = document.getElementById($(dragElem).attr("for"));

            var dragSpan = document.createElement("span");
            dragSpan.innerHTML = dragElem.innerHTML;
            dragSpan.id = this.divid + dragElem.id;
            $(dragSpan).attr("draggable","true");
            $(dragSpan).addClass("draggable-drag");

            var dropSpan = null;
            tmp2.forEach(element => {
                if (element.id === this.divid + dropElem.id) {
                    dropSpan = element;
                }
            });
            if (dropSpan === null) {
                dropSpan = document.createElement("span");
                dropSpan.innerHTML = dropElem.innerHTML;
                dropSpan.id = this.divid + dropElem.id;
                $(dropSpan).addClass("draggable-drop");
                tmp2.push(dropSpan);
            }

            this.setDragStartEventListener(this, dragSpan);
            var tmpArr = [];
            tmpArr.push(dragSpan);
            tmpArr.push(dropSpan);
            this.dragPairArray.push(tmpArr);
        } else if ($(this.origElem.childNodes[i]).data("component") === "question") {
            this.question = this.origElem.childNodes[i].innerHTML;
        } else if ($(this.origElem.childNodes[i]).data("component") === "feedback") {
            this.feedback = this.origElem.childNodes[i].innerHTML;
        } else if ($(this.origElem.childNodes[i]).data("component") === "orientation") {
            this.orientation = this.origElem.childNodes[i].textContent;
        }
    }
};

/*========================================
== Create new HTML elements and replace ==
==      original element with them      ==
========================================*/
DragNDrop.prototype.createNewElements = function () {
    var horizontal = (this.orientation === "horizontal");

    this.containerDiv = document.createElement("div");
    $(this.containerDiv).addClass("alert alert-warning draggable-container");
    if (horizontal) {
        $(this.containerDiv).addClass("horizontal");
    }
    var t = document.createElement("div");
    $(t).text(this.question);
    $(t).addClass("question");
    this.containerDiv.appendChild(t);

    this.dragDropWrapDiv = document.createElement("div");   // Holds the draggables/dropzones, prevents feedback from bleeding in
    if (horizontal) {
        $(this.dragDropWrapDiv).css("display", "flex");
        $(this.containerDiv).addClass("horizontal");
        $(this.dragDropWrapDiv).css("width", "100%");
    } else {
        $(this.dragDropWrapDiv).css("display", "block");
    }
    this.containerDiv.appendChild(this.dragDropWrapDiv);

    this.draggableDiv = document.createElement("div");
    $(this.draggableDiv).addClass("draggable dragzone");
    if (horizontal) {
        $(this.draggableDiv).addClass("horizontal");
        $(this.draggableDiv).css("width", "100%");
    }
    this.dragDropWrapDiv.appendChild(this.draggableDiv);
 
    this.dropZoneDiv = document.createElement("div");
    $(this.dropZoneDiv).addClass("draggable dropzone");
    if (horizontal) {
        this.dropZoneDiv = this.dragDropWrapDiv;
    } else {
        this.dragDropWrapDiv.appendChild(this.dropZoneDiv);
    }

    this.createButtons();
    this.checkServer("dragNdrop");
};

DragNDrop.prototype.finishSettingUp = function () {
    this.appendReplacementSpans();
    this.renderFeedbackDiv();

    $(this.origElem).replaceWith(this.containerDiv);
    if (!this.hasStoredDropzones) {
        this.minheight = $(this.draggableDiv).height();
    }
    this.draggableDiv.style.minHeight = this.minheight.toString() + "px";
    if ($(this.dropZoneDiv).height() > this.minheight) {
        this.dragDropWrapDiv.style.minHeight = $(this.dropZoneDiv).height().toString() + "px";
    } else {
        this.dragDropWrapDiv.style.minHeight = this.minheight.toString() + "px";
    }
};

DragNDrop.prototype.createButtons = function () {
    this.buttonDiv = document.createElement("div");
    this.submitButton = document.createElement("button");    // Check me button
    this.submitButton.textContent = "Check Me";
    $(this.submitButton).attr({
        "class": "btn btn-success drag-button",
        "name": "do answer",
        "type": "button",
    });

    this.submitButton.onclick = function () {
        this.dragEval(true);
    }.bind(this);

    this.resetButton = document.createElement("button");    // Check me button
    this.resetButton.textContent = "Reset";
    $(this.resetButton).attr({
        "class": "btn btn-default drag-button drag-reset",
        "name": "do answer",
    });

    this.resetButton.onclick = function () {
        this.resetDraggables();
    }.bind(this);

    this.buttonDiv.appendChild(this.submitButton);
    this.buttonDiv.appendChild(this.resetButton);
    this.containerDiv.appendChild(this.buttonDiv);
};

DragNDrop.prototype.appendReplacementSpans = function () {
    for (var i = 0; i < this.dragPairArray.length; i++) {
        var drop = this.dragPairArray[i][1];
        if (!this.dropZoneDiv.contains(drop)) {
            this.dropZoneDiv.appendChild(drop);
        }
    }
    
    this.createIndexArray();
    this.randomizeIndexArray();
    for (var n = 0; n < this.indexArray.length; n++) {
        var i = this.indexArray[n];
        var drag = this.dragPairArray[i][0];
        var drop = this.draggableDiv;
        if (this.hasStoredDropzones) {
            if (this.pregnantIndexArray[i] != -1) {
                drop = this.dragPairArray[this.pregnantIndexArray[i]][1];
            }
        }
        drop.appendChild(drag);
    }
};

DragNDrop.prototype.setDragStartEventListener = function (obj, dgSpan) {
    // Adds HTML5 "drag and drop" UI functionality
    $(dgSpan).on("dragstart", function (ev) {
        var dropZones = $(ev.target).closest(".draggable-container").find(".dragzone, .draggable-drop");
        ev.originalEvent.dataTransfer.effectAllowed = 'move';
        $(dropZones).each(function(i, dpSpan) {
            $(dpSpan).on("dragover", { id: ev.target.id }, function (ev) {
                ev.preventDefault();
                ev.originalEvent.dataTransfer.dropEffect = 'move';
                var draggedSpan = document.getElementById(ev.data.id);
                if (!$.contains(ev.currentTarget, draggedSpan)) {
                    $(ev.currentTarget).addClass("possibleDrop");
                }
            });
        
            $(dpSpan).on("dragleave", { id: ev.target.id }, function (ev) {
                ev.preventDefault();
                $(ev.currentTarget).removeClass("possibleDrop");
            });
        
            $(dpSpan).on("drop", { id: ev.target.id }, function (ev) {
                var data = ev.data;
                ev.preventDefault();
                if ($(ev.currentTarget).hasClass("possibleDrop")) {
                    $(ev.currentTarget).removeClass("possibleDrop");
                    var draggedSpan = document.getElementById(ev.data.id);
                    ev.currentTarget.appendChild(draggedSpan);
                    obj.slideEmptyDropSlotsToTop();
                }
                obj.getAllDropZones(ev.target).each(function(i, element) {
                    obj.removeDropEventListeners(element);
                });
            });
        });
    });

    $(dgSpan).on("dragend", function (ev) {
        obj.getAllDropZones(ev.target).each(function(i, element) {
            obj.removeDropEventListeners(element);
        });
    });
};

DragNDrop.prototype.getAllDropZones = function (dgSpan) {
    return $(dgSpan)
        .closest(".draggable-container")
        .find(".dragzone, .draggable-drop");
}

DragNDrop.prototype.removeDropEventListeners = function (dpSpan) {
    $(dpSpan).off("dragover");
    $(dpSpan).off("dragleave");
    $(dpSpan).off("drop");
    $(dpSpan).off("dragend");
};

DragNDrop.prototype.renderFeedbackDiv = function () {
    if (!this.feedBackDiv) {
        this.feedBackDiv = document.createElement("div");
        this.feedBackDiv.id = this.divid + "_feedback";
        this.containerDiv.appendChild(document.createElement("br"));
        this.containerDiv.appendChild(this.feedBackDiv);
    }
};
/*=======================
== Auxiliary functions ==
=======================*/

DragNDrop.prototype.slideEmptyDropSlotsToTop = function () {
    // Sliding up only applies to vertical drop zones, not horizontal ones...
    if (this.orientation === "horizontal")
        return;

    var finished = false;
    while (!finished) {
        finished = true;
        for (var i = 0; i < this.dropZoneDiv.childNodes.length - 1; i++) {
            if (this.dropZoneDiv.childNodes[i].children.length > 0 && this.dropZoneDiv.childNodes[i + 1].children.length == 0) {
                this.dropZoneDiv.insertBefore(this.dropZoneDiv.childNodes[i + 1], this.dropZoneDiv.childNodes[i]);
                finished = false;
            }
        }
    }
}

DragNDrop.prototype.shuffleDivChildren = function (parentDiv) {
    for (var i = 0; i < parentDiv.childNodes.length * 5; i++) {
        var randomIndex = Math.floor(Math.random() * parentDiv.childNodes.length);
        parentDiv.appendChild(parentDiv.childNodes[randomIndex]);
    }
}

DragNDrop.prototype.createIndexArray = function () {
    this.indexArray = [];
    for (var i = 0; i < this.dragPairArray.length; i++) {
        this.indexArray.push(i);
    }
};

DragNDrop.prototype.randomizeIndexArray = function () {
    // Shuffles around indices so the matchable elements aren't in a predictable order
    var currentIndex = this.indexArray.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = this.indexArray[currentIndex];
        this.indexArray[currentIndex] = this.indexArray[randomIndex];
        this.indexArray[randomIndex] = temporaryValue;
    }
};
/*==============================
== Reset button functionality ==
==============================*/
DragNDrop.prototype.resetDraggables = function () {
    for (var i = 0; i < this.dragPairArray.length; i++) {
        $(this.dragPairArray[i][0]).removeClass("drop-incorrect");
        for (var j = 0; j < this.dragPairArray[i][1].childNodes.length; j++) {
            if ($(this.dragPairArray[i][1].childNodes[j]).attr("draggable") === "true") {
                this.draggableDiv.appendChild(this.dragPairArray[i][1].childNodes[j]);
            }
        }
    }
    this.feedBackDiv.style.display = "none";
    this.shuffleDivChildren(this.draggableDiv);
};
/*===========================
== Evaluation and feedback ==
===========================*/

DragNDrop.prototype.dragEval = function (logFlag) {
    this.correct = true;
    this.incorrectNum = 0;
    this.dragNum = this.dragPairArray.length;
    for (var i = 0; i < this.dragPairArray.length; i++) {
        var drag = this.dragPairArray[i][0];
        var expectedDrop = this.dragPairArray[i][1];
        var actualDrop = drag.parentElement;
        if (actualDrop != expectedDrop) {
            this.correct = false;
            $(drag).addClass("drop-incorrect");
            this.incorrectNum++;
        }
        else {
            $(drag).removeClass("drop-incorrect");
        }
    }
    this.correctNum = this.dragNum - this.incorrectNum;
    this.setLocalStorage({"correct": (this.correct ? "T" : "F")});
    this.renderFeedback();
    if (logFlag) {  // Sometimes we don't want to log the answers--for example, on re-load of a timed exam
        let answer = this.pregnantIndexArray.join(";");
        this.logBookEvent({
            "event": "dragNdrop",
            "act": answer,
            "answer": answer,
            "minHeight": this.minheight,
            "div_id": this.divid,
            "correct": this.correct,
            "correctNum": this.correctNum,
            "dragNum": this.dragNum
        });
    }
};

DragNDrop.prototype.renderFeedback = function () {
    if (!this.feedBackDiv) {
        this.renderFeedbackDiv();
    }
    this.feedBackDiv.style.display = "block";
    if (this.correct) {
        $(this.feedBackDiv).html("You are correct!");
        $(this.feedBackDiv).attr("class", "alert alert-info draggable-feedback");
    } else {
        $(this.feedBackDiv).html("Incorrect!");
        $(this.feedBackDiv).attr("class", "alert alert-danger draggable-feedback");
    }
};
/*===================================
=== Checking/restoring from storage ===
===================================*/

DragNDrop.prototype.restoreAnswers = function (data) {
    // Restore answers from storage retrieval done in RunestoneBase
    this.hasStoredDropzones = true;
    this.minheight = data.minHeight;
    this.pregnantIndexArray = data.answer.split(";");
    this.finishSettingUp();
    this.slideEmptyDropSlotsToTop();
};

DragNDrop.prototype.checkLocalStorage = function () {
    this.hasStoredDropzones = false;
    var len = localStorage.length;
    if (len > 0) {
        var ex = localStorage.getItem(this.localStorageKey());
        if (ex !== null) {
            this.hasStoredDropzones = true;
            try {
                var storedObj = JSON.parse(ex);
                this.minheight = storedObj.minHeight;
            } catch (err) {
                // error while parsing; likely due to bad value stored in storage
                console.log(err.message);
                localStorage.removeItem(this.localStorageKey());
                this.hasStoredDropzones = false;
                this.finishSettingUp();
                this.slideEmptyDropSlotsToTop();
                return;
            }
            this.pregnantIndexArray = storedObj.answer.split(";");
            if (this.useRunestoneServices) {
                // store answer in database
                var answer = this.pregnantIndexArray.join(";");
                this.logBookEvent({"event": "dragNdrop", "act": answer, "answer":answer, "minHeight": this.minheight, "div_id": this.divid, "correct": storedObj.correct});
            }
        }
    }
    this.finishSettingUp();
    this.slideEmptyDropSlotsToTop();
};

DragNDrop.prototype.setLocalStorage = function (data) {
    if (data.answer === undefined) {   // If we didn't load from the server, we must generate the data
        this.pregnantIndexArray = [];
        for (var i = 0; i < this.dragPairArray.length; i++) {
            var drag = this.dragPairArray[i][0];
            var dropped = false;
            for (var j = 0; j < this.dragPairArray.length; j++) {
                var drop = this.dragPairArray[j][1];
                if ($(drop).has(drag).length) {
                    this.pregnantIndexArray.push(j);
                    dropped = true;
                    break;
                }
            }
            if (!dropped) {
                this.pregnantIndexArray.push(-1);
            }
        }
    }

    var timeStamp = new Date();
    var correct = data.correct;
    var storageObj = {"answer": this.pregnantIndexArray.join(";"), "minHeight": this.minheight, "timestamp": timeStamp, "correct": correct};
    localStorage.setItem(this.localStorageKey(), JSON.stringify(storageObj));
};
/*=================================
== Find the custom HTML tags and ==
==   execute our code on them    ==
=================================*/
$(document).bind("runestone:login-complete", function () {
    $("[data-component=dragndrop]").each(function (index) {
        var opts = {"orig": this, 'useRunestoneServices':eBookConfig.useRunestoneServices};
        if ($(this).closest('[data-component=timedAssessment]').length == 0) {   // If this element exists within a timed component, don't render it here
            ddList[this.id] = new DragNDrop(opts);
        }
    });
});

if (typeof component_factory === 'undefined') {
    component_factory = {}
}
component_factory['dragndrop'] = function(opts) { return new DragNDrop(opts)}
