﻿/*
WAToolkit
Author: Cristian Perez <http://www.cpr.name>
License: GNU GPLv3
*/


var debug = false;
var debugRepeating = false;

var whatsAppUrl = "https://web.whatsapp.com/";
var rateUrl = "https://chrome.google.com/webstore/detail/watoolkit/fedimamkpgiemhacbdhkkaihgofncola/reviews";
var optionsFragment = "#watOptions";
var sourceChatFragment = "#watSrcChat=";

var safetyDelayShort = 300;
var safetyDelayLong = 600;

var checkBadgeInterval = 5000;
var checkLoadingErrorInterval = 30000;

// Default options, should match the ones defined in background.js
var backgroundNotif = true;
var wideText = false;

// Prevent page exit confirmation dialog. The content script's window object is not shared: http://stackoverflow.com/a/12396221/423171
var scriptElem = document.createElement("script");
scriptElem.innerHTML = "window.onbeforeunload = null;"
document.head.appendChild(scriptElem);

chrome.runtime.sendMessage({ name: "getIsBackgroundPage" }, function (isBackgroundPage)
{
    if (isBackgroundPage)
    {
        if (debug) console.info("WAT: Background script injected");

        backgroundScript();
    }
    else
    {
        if (debug) console.info("WAT: Foreground script injected");

        foregroundScript();
    }

    chrome.runtime.sendMessage({ name: "getOptions" }, function (options)
    {
        if (debug) console.info("WAT: Got options: " + JSON.stringify(options));

        backgroundNotif = options.backgroundNotif;
        wideText = options.wideText;

        if (!isBackgroundPage)
        {
            updateWideText();
        }
    });
});

function backgroundScript()
{
    onMainUiReady(function ()
    {
        proxyNotifications(true);
        checkBadge(false);
        reCheckBadge();
    });

    reCheckLoadingError();
}

function foregroundScript()
{
    onMainUiReady(function ()
    {
        proxyNotifications(false);
        checkBadge(false);
        reCheckBadge();

        checkSrcChat();
        addOptions();
    });
}

// FOR BOTH BACKGROUND AND FOREGROUND SCRIPTS ////////////////////////////////////////////////////

function onMainUiReady(callback)
{
    try
    {
        // First check if the main UI is already ready, just in case
        if (document.querySelector(".app-wrapper > .app") != undefined)
        {
            if (debug) console.info("WAT: Found main UI, will notify main UI ready event directly");

            setTimeout(function () { callback(); }, safetyDelayShort);
        }
        else
        {
            if (debug) console.info("WAT: Setting up mutation observer for main UI ready event...");

            var appElem = document.getElementById("app");
            if (appElem != undefined)
            {
                var mutationObserver = new MutationObserver(function (mutations)
                {
                    if (debug) console.info("WAT: Mutation observerd, will search main UI");

                    // Search for new child div with class "app"
                    var found = false;
                    for (var i = 0; i < mutations.length; i++)
                    {
                        var mutation = mutations[i];
                        var addedNodes = mutations[i].addedNodes;
                        for (var j = 0; j < addedNodes.length; j++)
                        {
                            var addedNode = addedNodes[j];
                            if (addedNode.nodeName.toLowerCase() == "div" && addedNode.classList.contains("app"))
                            {
                                if (debug) console.info("WAT: Found main UI, will notify main UI ready event");

                                mutationObserver.disconnect();
                                setTimeout(function () { callback(); }, safetyDelayShort);
                                found = true;
                                break;
                            }
                        }
                        if (found)
                        {
                            break;
                        }
                    }
                });
                mutationObserver.observe(appElem, { childList: true, subtree: true });
            }
        }
    }
    catch (err)
    {
        console.error("WAT: Exception while setting up mutation observer for main UI ready event");
        console.error(err);
    }
}

function proxyNotifications(isBackgroundScript)
{
    // The content script's window object is not shared: http://stackoverflow.com/a/12396221/423171

    if (isBackgroundScript)
    {
        window.addEventListener("message", function (event)
        {
            if (event != undefined && event.data != undefined && event.data.name == "backgroundNotificationClicked")
            {
                chrome.runtime.sendMessage({ name: "backgroundNotificationClicked", srcChat: event.data.srcChat });
            }
        });
    }
    else
    {
        window.addEventListener("message", function (event)
        {
            if (event != undefined && event.data != undefined && (event.data.name == "foregroundNotificationClicked" || event.data.name == "foregroundNotificationShown"))
            {
                setTimeout(function () { checkBadge(false); }, safetyDelayLong);
            }
        });
    }

    var script = "";
    script += "var debug = " + debug + ";";
    script += "var isBackgroundScript = " + isBackgroundScript + ";";
    script += "var backgroundNotif = " + backgroundNotif + ";";
    script += "(" + function ()
    {
        // Notification spec: https://developer.mozilla.org/en/docs/Web/API/notification

        // Save native notification
        var _Notification = window.Notification;

        // Create proxy notification
        var ProxyNotification = function (title, options)
        {
            if (isBackgroundScript && !backgroundNotif)
            {
                if (debug) console.info("WAT: Notification creation intercepted, will not proxy it because the user disabled background notifications");

                return;
            }
            else
            {
                if (debug) console.info("WAT: Notification creation intercepted, will proxy it");
            }

            // Proxy constructor
            var _notification = new _Notification(title, options);

            // Proxy instance properties
            this.title = _notification.title;
            this.dir = _notification.dir;
            this.lang = _notification.lang;
            this.body = _notification.body;
            this.tag = _notification.tag;
            this.icon = _notification.icon;

            // Proxy event handlers
            var that = this;
            _notification.onclick = function (event)
            {
                if (that.onclick != undefined) that.onclick(event);

                if (isBackgroundScript)
                {
                    var srcChat = undefined;
                    if (event != undefined && event.srcElement != undefined && typeof event.srcElement.tag == "string")
                    {
                        srcChat = event.srcElement.tag;
                        srcChat = srcChat.substr(0, srcChat.indexOf("@") > -1 ? srcChat.indexOf("@") + 2 : 0);
                        if (srcChat.length == 0) srcChat = "unknown";

                        if (debug) console.info("WAT: Background notification click intercepted with srcChat " + srcChat);
                    };
                    window.postMessage({ name: "backgroundNotificationClicked", srcChat: srcChat }, "*");
                }
                else
                {
                    if (debug) console.info("WAT: Foreground notification click intercepted");

                    window.postMessage({ name: "foregroundNotificationClicked" }, "*");
                };
            };
            _notification.onshow = function (event)
            {
                if (that.onshow != undefined) that.onshow(event);

                if (!isBackgroundScript)
                {
                    if (debug) console.info("WAT: Foreground notification show intercepted");

                    window.postMessage({ name: "foregroundNotificationShown" }, "*");
                };
            };
            _notification.onerror = function (event)
            {
                if (that.onerror != undefined) that.onerror(event);
            };
            _notification.onclose = function (event)
            {
                if (that.onclose != undefined) that.onclose(event);
            };

            // Proxy instance methods
            this.close = function ()
            {
                _notification.close();
            };
            this.addEventListener = function (type, listener, useCapture)
            {
                _notification.addEventListener(type, listener, useCapture);
            };
            this.removeEventListener = function (type, listener, useCapture)
            {
                _notification.removeEventListener(type, listener, useCapture);
            };
            this.dispatchEvent = function (event)
            {
                _notification.dispatchEvent(event);
            };
        };

        // Proxy static properties
        ProxyNotification.permission = _Notification.permission;

        // Proxy static methods
        ProxyNotification.requestPermission = _Notification.requestPermission;

        // Replace native notification with proxy notification
        window.Notification = ProxyNotification;
    } + ")();";

    var scriptElem = document.createElement("script");
    scriptElem.innerHTML = script;
    document.head.appendChild(scriptElem);
}

var lastToolbarIconWarn = -1;
var lastToolbarIconBadgeText = -1;
var lastToolbarIconTooltipText = -1;

function reCheckBadge()
{
    setTimeout(function () { checkBadge(true); }, checkBadgeInterval);
}

function checkBadge(reCheck)
{
    if (debugRepeating) console.info("WAT: Checking badge...");

    try
    {
        var isSessionActive = document.getElementsByClassName("pane-list-user").length > 0;
        var warn = !isSessionActive || document.getElementsByClassName("butterbar-phone").length > 0 || document.getElementsByClassName("butterbar-computer").length > 0;

        if (isSessionActive)
        {
            var totalUnreadCount = 0;
            var tooltipText = "";

            var unreadChatElems = document.getElementsByClassName("chat unread");
            for (var i = 0; i < unreadChatElems.length; i++)
            {
                unreadChatElem = unreadChatElems[i];
                var unreadCount = parseInt(unreadChatElem.getElementsByClassName("unread-count")[0].textContent);
                var chatTitle = unreadChatElem.getElementsByClassName("chat-title")[0].textContent;
                if (chatTitle.length > 30) // Max 30 chars
                {
                    chatTitle = chatTitle.substr(0, 30 - 3) + "...";
                }
                var chatStatus = unreadChatElem.getElementsByClassName("chat-status")[0].textContent;
                if (chatStatus.length > 70) // Max 70 chars
                {
                    chatStatus = chatStatus.substr(0, 70 - 3) + "...";
                }
                var chatTime = unreadChatElem.getElementsByClassName("chat-time")[0].textContent;
                totalUnreadCount += unreadCount;
                tooltipText += (i > 0 ? "\n" : "") + "(" + unreadCount + ")  " + chatTitle + "  →  " + chatStatus + "  [" + chatTime + "]";
            }

            var badgeText = "";
            if (totalUnreadCount > 0)
            {
                badgeText = totalUnreadCount.toString();
            }
            if (tooltipText.length == 0)
            {
                tooltipText = "Open WhatsApp"; // Should match browser_action.default_title defined in manifest.json
            }
            if (lastToolbarIconWarn !== warn || lastToolbarIconBadgeText !== badgeText || lastToolbarIconTooltipText !== tooltipText)
            {
                if (debug) console.info("WAT: Will update toolbar icon info");

                chrome.runtime.sendMessage({ name: "setToolbarIcon", warn: warn, badgeText: badgeText, tooltipText: tooltipText });
                lastToolbarIconWarn = warn;
                lastToolbarIconBadgeText = badgeText;
                lastToolbarIconTooltipText = tooltipText;
            }
            else
            {
                if (debugRepeating) console.info("WAT: Will not update toolbar icon info because it did not change");
            }
        }
        else
        {
            if (lastToolbarIconWarn !== warn)
            {
                if (debug) console.info("WAT: Will update toolbar icon warning info");

                chrome.runtime.sendMessage({ name: "setToolbarIcon", warn: warn });
                lastToolbarIconWarn = warn;
            }
            else
            {
                if (debugRepeating) console.info("WAT: Will not update toolbar icon warning info because it did not change");
            }
        }
    }
    catch (err)
    {
        console.error("WAT: Exception while checking badge");
        console.error(err);
    }

    if (reCheck)
    {
        reCheckBadge();
    }
}

// FOR BACKGROUND SCRIPT /////////////////////////////////////////////////////////////////////////

var lastPotentialLoadingError = false;

function reCheckLoadingError()
{
    setTimeout(function () { checkLoadingError(); }, checkLoadingErrorInterval);
}

function checkLoadingError()
{
    if (debug) console.info("WAT: Checking potential loading error...");

    try
    {
        var potentialLoadingError = document.getElementsByClassName("spinner").length > 0;

        if (potentialLoadingError && !lastPotentialLoadingError)
        {
            if (debug) console.warn("WAT: Found potential loading error");
        }

        if (lastPotentialLoadingError && potentialLoadingError)
        {
            if (debug) console.warn("WAT: Found loading error, will reload");

            window.location.href = whatsAppUrl;
        }
        else
        {
            lastPotentialLoadingError = potentialLoadingError;
        }
    }
    catch (err)
    {
        console.error("WAT: Exception while checking loading error");
        console.error(err);
    }

    reCheckLoadingError();
}

// FOR FOREGROUND SCRIPT /////////////////////////////////////////////////////////////////////////

function checkSrcChat()
{
    if (debug) console.info("WAT: Checking source chat...");

    try
    {
        var fragment = window.location.hash;
        if (typeof fragment == "string" && fragment.indexOf(sourceChatFragment) == 0)
        {
            var srcChat = fragment.substr(sourceChatFragment.length);
            var chats = document.getElementsByClassName("chat");
            for (var i = 0; i < chats.length; i++)
            {
                var chat = chats[i];
                var dataReactId = chat.getAttribute("data-reactid");
                if ((typeof dataReactId == "string") && dataReactId.indexOf(srcChat) > -1)
                {
                    if (debug) console.info("WAT: Found source chat, will click it");
                    
                    history.replaceState({}, document.title, "/");
                    setTimeout(function ()
                    {
                        // For some reason chat.click() stopped working
                        chat.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
                    }, safetyDelayShort); // The delay fixes some strange page misposition glitch
                    break;
                }
            }
        }
    }
    catch (err)
    {
        console.error("WAT: Exception while checking source chat");
        console.error(err);
    }
}

function addOptions()
{
    if (debug) console.info("WAT: Adding options...");

    try
    {
        var firstMenuItem = document.getElementsByClassName("menu-item")[0];
        if (firstMenuItem != undefined)
        {
            if (debug) console.info("WAT: Will add options");

            var menuItemElem = document.createElement("div");
            menuItemElem.setAttribute("class", "menu-item menu-item-watoolkit");
            var iconElem = document.createElement("button");
            iconElem.setAttribute("class", "icon icon-watoolkit");
            iconElem.setAttribute("title", "WAToolkit options");
            iconElem.innerHTML = "WAToolkit options";
            menuItemElem.appendChild(iconElem);
            firstMenuItem.parentElement.insertBefore(menuItemElem, firstMenuItem);

            chrome.runtime.sendMessage({ name: "getOptions" }, function (options)
            {
                if (debug) console.info("WAT: Got options: " + JSON.stringify(options));

                backgroundNotif = options.backgroundNotif;
                wideText = options.wideText;

                var dropContent = " \
                <div class='watoolkit-options-container'> \
                    <div class='watoolkit-options-title'>WAToolkit options</div> \
                    <div id='watoolkit-option-background-notif' class='watoolkit-options-item'> \
                        <div class='checkbox checkbox-watoolkit " + (backgroundNotif ? "checked" : "unchecked") + "'><div class='checkmark'></div></div> \
                        Background notifications \
                        <div class='watoolkit-options-description'>Enable background notifications to receive new message notifications even when you have no WhatsApp tab or Chrome window at all open. Regular notifications must be enabled in WhatsApp's menu for this to work.</div> \
                    </div> \
                    <div id='watoolkit-option-wide-text' class='watoolkit-options-item'> \
                        <div class='checkbox checkbox-watoolkit " + (wideText ? "checked" : "unchecked") + "'><div class='checkmark'></div></div> \
                        Wide text bubbles \
                        <div class='watoolkit-options-description'>Enable wide text bubbles to make use of the full chat panel width in both outgoing and incomming messages.</div> \
                    </div> \
                    <div id='watoolkit-option-rate' class='watoolkit-options-item watoolkit-rate'> \
                        <div class='watoolkit-rate-heart'>❤</div> \
                        Rate WAToolkit in Chrome Web Store \
                        <div class='watoolkit-options-description'>If you enjoy WATookit and would like the development to continue, please help us with a 5 star ★★★★★ rating on Chrome Web Store.</div> \
                    </div> \
                </div>";

                var drop = new Drop({
                    target: menuItemElem,
                    content: dropContent,
                    position: "bottom left",
                    classes: "drop-theme-watoolkit",
                    openOn: "click",
                    tetherOptions: {
                        offset: "-4px -4px 0 0"
                    }
                });
                drop.on("open", function()
                {
                    document.getElementsByClassName("menu-item-watoolkit")[0].setAttribute("class", "menu-item active menu-item-watoolkit");

                    document.getElementById("watoolkit-option-background-notif").addEventListener("click", optionBackgroundNotifClick);
                    document.getElementById("watoolkit-option-wide-text").addEventListener("click", optionWideTextClick);
                    document.getElementById("watoolkit-option-rate").addEventListener("click", optionRateClick);
                });
                drop.on("close", function()
                {
                    document.getElementsByClassName("menu-item-watoolkit")[0].setAttribute("class", "menu-item menu-item-watoolkit");

                    document.getElementById("watoolkit-option-background-notif").removeEventListener("click", optionBackgroundNotifClick);
                    document.getElementById("watoolkit-option-wide-text").removeEventListener("click", optionWideTextClick);
                    document.getElementById("watoolkit-option-rate").removeEventListener("click", optionRateClick);
                });

                var fragment = window.location.hash;
                if (typeof fragment == "string" && fragment.indexOf(optionsFragment) == 0)
                {
                    history.replaceState({}, document.title, "/");
                    setTimeout(function () { drop.open(); }, safetyDelayLong); // The delay fixes a potential dialog misposition glitch
                }
            });
        }
    }
    catch (err)
    {
        console.error("WAT: Exception while adding options");
        console.error(err);
    }
}

function optionBackgroundNotifClick()
{
    var checkbox = document.querySelector("#watoolkit-option-background-notif .checkbox-watoolkit");
    var checkboxClass = checkbox.getAttribute("class");
    if (checkboxClass.indexOf("unchecked") > -1)
    {
        checkbox.setAttribute("class", checkboxClass.replace("unchecked", "checked"));
        backgroundNotif = true;
    }
    else
    {
        checkbox.setAttribute("class", checkboxClass.replace("checked", "unchecked"));
        backgroundNotif = false;
    }
    chrome.runtime.sendMessage({ name: "setOptions", backgroundNotif: backgroundNotif });
}

function optionWideTextClick()
{
    var checkbox = document.querySelector("#watoolkit-option-wide-text .checkbox-watoolkit");
    var checkboxClass = checkbox.getAttribute("class");
    if (checkboxClass.indexOf("unchecked") > -1)
    {
        checkbox.setAttribute("class", checkboxClass.replace("unchecked", "checked"));
        wideText = true;
    }
    else
    {
        checkbox.setAttribute("class", checkboxClass.replace("checked", "unchecked"));
        wideText = false;
    }
    chrome.runtime.sendMessage({ name: "setOptions", wideText: wideText });
    updateWideText();
}

function optionRateClick()
{
    window.open(rateUrl);
}

var wideTextStyleElem;

function updateWideText()
{
    if (debug) console.info("WAT: Updating wide text...");

    if (wideTextStyleElem == undefined)
    {
        wideTextStyleElem = document.createElement("style");
        wideTextStyleElem.setAttribute("type", "text/css");
        wideTextStyleElem.innerHTML = ".message-in, .message-out { max-width: 100% !important; }";
    }

    if (wideText && wideTextStyleElem.parentElement == undefined)
    {
        if (debug) console.info("WAT: Will update wide text");

        document.getElementsByTagName("head")[0].appendChild(wideTextStyleElem);
    }
    else if (!wideText && wideTextStyleElem.parentElement != undefined)
    {
        if (debug) console.info("WAT: Will update wide text");

        wideTextStyleElem.parentElement.removeChild(wideTextStyleElem);
    }
}
