var token_validated = null;
var token_in_validation = null;
var url_validated = null;
var url_in_validation = null;
var gift = {};

function tokenIsValidated() {
    document.querySelector("#form_personal_token").classList.add("hidden");
    document.querySelector("#login_succeeded").classList.remove("hidden");
}

function saveToken(token_submitted) {
    console.log("token_submitted :" + token_submitted);
    token_validated = token_submitted
    browser.storage.sync.set({
        token: token_submitted
    });
}
function saveUrl(url_submitted) {
    console.log("url_submitted :" + url_submitted);
    url_validated = url_submitted
    browser.storage.sync.set({
        url: url_submitted
    });
}

function deleteGift() {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.open("DELETE", url_validated+"api/gift/" + gift.created_id);
    xhr.setRequestHeader("Authorization", "Bearer " + token_validated);
    xhr.setRequestHeader("cache-control", "no-cache");
    xhr.send(null);
    console.log("deleted")
}

function addGift(name_dest, gift_name, url) {
    gift.name_dest_input = name_dest
    gift.gift_name = gift_name
    gift.url = url

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", callbackContacts);

    xhr.open("GET", url_validated+"api/contacts?query=" + name_dest);
    xhr.setRequestHeader("Authorization", "Bearer " + token_validated);
    xhr.setRequestHeader("cache-control", "no-cache");
    xhr.send(null);
}

function callbackContacts() {
    if (this.readyState === XMLHttpRequest.DONE) {
        if (this.status === 200) {
            console.log("Réponse reçue: %s", this.responseText);
            contacts = JSON.parse(this.responseText);
            if (contacts.meta.total > 0) {
                console.log("Contact found: %s %s,%d", contacts.data[0].first_name, contacts.data[0].last_name, contacts.data[0].id);
                gift.first_name_dest = contacts.data[0].first_name
                gift.last_name_dest = contacts.data[0].last_name
                gift.id_dest = contacts.data[0].id
                postGift()
            } else {
                //TODO Show error
                console.log("Contact not found");
                document.querySelector("#submit_gift").disabled = false;
            }
        } else {
            console.log("Status Answer : %d (%s)", this.status, this.statusText);
            document.querySelector("#submit_gift").disabled = false;

        }
    }
}

function postGift() {
    var data = null;

    data = JSON.stringify({
        'name': gift.gift_name,
        'comment': "",
        'url': gift.url,
        'is_an_idea': 1,
        'contact_id': gift.id_dest
    });
    console.log("Data sent:" + data)
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", callbackGift);

    xhr.open("POST", url_validated+"api/gifts");
    xhr.setRequestHeader("Authorization", "Bearer " + token_validated);
    xhr.setRequestHeader("cache-control", "no-cache");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(data);
}


function callbackGift() {
    if (this.readyState === XMLHttpRequest.DONE) {
        if (this.status === 201) {
            console.log("Réponse reçue: %s", this.responseText);
            contacts = JSON.parse(this.responseText);
            gift.created_id = contacts.data.id
            document.querySelector("#gift_result").innerHTML += "Gift for " + gift.first_name_dest + " " + gift.last_name_dest + "</br>\
            <div class=\"cancel_gift button\" style=\"border: black;border-style: groove;\">Cancel it ?</div> "
        } else {
            console.log("Status Answer : %d (%s)", this.status, this.statusText);
        }
        document.querySelector("#submit_gift").disabled = false;
    }
}
/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {

    document.addEventListener("click", (e) => {

        if (e.target.classList.contains("submit_token")) {
            //      document.querySelector("#personal-token-submitted").innerHTML += "<p>"+document.querySelector("#personal-token").value+"</p>"
            validateToken(document.querySelector("#personal-token").value,document.querySelector("#monica_url").value)
            document.querySelector("#submit_token").disabled = true;
        } else if (e.target.classList.contains("submit_gift")) {
            browser.tabs.query({
                active: true,
                currentWindow: true
            }, function(tabs) {
                var url = tabs[0].url;
                addGift(document.querySelector("#gift_dest").value, document.querySelector("#gift_name").value, url)
            });
            document.querySelector("#submit_gift").disabled = true;
        } else if (e.target.classList.contains("cancel_gift")) {
            document.querySelector("#gift_result").innerHTML = ""
            deleteGift()
        }

    });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
    document.querySelector("#error-content").classList.remove("hidden");
    document.querySelector("#content").classList.add("hidden");
    
    console.error(`Failed to launch addon: ${error.message}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs.executeScript({
        file: "/content_scripts/injected.js"
    })
    .then(listenForClicks)
    .catch(reportExecuteScriptError);

function validateToken(token,url) {
    function callback() {
        if (this.readyState === XMLHttpRequest.DONE) {
            if (this.status === 200) {
                if (this.responseText.search("Welcome to Monica") > -1) {
                    console.log("Answer received: %s", this.responseText);
                    //document.querySelector("#answer").innerHTML += "<p>Good Token</p>"
                    saveToken(token_in_validation);
                    saveUrl(url_in_validation)
                    tokenIsValidated();
                } else {
                    console.log("Bad token");
                    browser.storage.sync.clear();
                }
            } else {
                console.log("Status Answer: %d (%s)", this.status, this.statusText);
            }
            document.querySelector("#submit_token").disabled = false;
        }

    };
    token_in_validation = token;
    url_in_validation = url;
    console.log("validating token:" + token)
    sendEcho_request(token, url,callback)
}


var gettingStoredStats = browser.storage.sync.get();

gettingStoredStats.then(results => {
    // Initialize the saved stats if not yet initialized.
    if (results.token) {
        document.querySelector("#submit_token").disabled = true;
        validateToken(results.token,results.url)
    };
});

function sendEcho_request(token, url, callback) {
    var data = null;

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", callback);

    xhr.open("GET", url+"api");
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.setRequestHeader("cache-control", "no-cache");
    xhr.timeout = 2000;
    xhr.send(data);
}