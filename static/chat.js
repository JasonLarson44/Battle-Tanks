// const io = require('socket.io-client')
var socket = io();
var USER = 'unknown';

socket.on('receive', function (msg) {
	addText(msg, 'remote');
});

socket.on('join-room', function (msglog) {
	for(var i = 0; i < msglog.length; i++) {
		var source = (msglog[i].name == USER)? 'local' : 'remote';
		addText(msglog[i], source);
	}

});

document.getElementById('input-field').addEventListener('keydown', function (event) {
	if(event.key == 'Enter') {
		var text = document.getElementById('input-field');
		if (text.value != "") {
			var msg = {
				name: USER,
				contents: text.value
			};
			socket.emit('send', msg);
			addText(msg, 'local');
			text.value = null;
		}
	}
});

document.getElementById('username-field').addEventListener('keydown', function(event) {
	if(event.key == 'Enter') {
		var value = document.getElementById('username-field').value;
		if(value != "") {
			USER = value;
			hideModal();
			socket.emit('new-user');
		}
	}
});


function addText(msg, source) {
	var textContainer = document.getElementById('received-texts');
	var name = document.createElement('div');
	var text = document.createElement('div');
	var textBox = document.createElement('div');
	text.innerText = msg.contents;
	name.innerText = msg.name;

	textBox.classList.add(source);
	name.classList.add('name');
	text.classList.add('text');

	textBox.appendChild(name);
	textBox.appendChild(text);

	textContainer.appendChild(textBox);
	textContainer.scrollTop = textContainer.scrollHeight;
}

function hideModal() {
	var backdrop = document.getElementsByClassName('modal-backdrop')[0];
	var modal = document.getElementsByClassName('modal')[0];
	backdrop.classList.add('hidden');
	modal.classList.add('hidden');

	// document.getElementById('input-field').focus();
}