// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { exec, execSync } = require("child_process");
let buildData = {
	built: false,
	output: "",
	installLog: ""
};
let ctx = {
	emulator: "basalt",
	knowsAboutShowOutput: false,
	outputChannel: vscode.window.createOutputChannel("pebble"),
	phoneIP: "0.0.0.0"
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('pebble-tool now running');

	disposable = vscode.commands.registerCommand('pebble-tool.build', function () {
		if (noPebbleTooling()) { return }

		vscode.window.setStatusBarMessage(`Building project`);
		ctx.outputChannel.appendLine("Building project");
		buildData.built = true
		buildData.time = new Date();

		try {
			var pbldir = vscode.workspace.workspaceFolders[0].uri.fsPath;
			console.log(pbldir)
			

			console.log("chgdir to " + pbldir);
			process.chdir(pbldir)
		} catch (e) {
			if (pbldir == undefined || pbldir == null) {
				ctx.outputChannel.appendLine("Building Aborted. Not a pebble project directory");
				vscode.window.showErrorMessage("Not a pebble project directory");
			} else {
				console.log("Could not change directory. Abort");
				vscode.window.showErrorMessage("Could not change directory to " + pbldir);
				buildData.output = "Could not change directory to " + pbldir
				ctx.outputChannel.appendLine(buildData.output)
			}
			vscode.window.setStatusBarMessage(`Build aborted`);
			return
		}


		exec("pebble build", (error, stdout, stderr) => {

			if (error) {
				buildData.output = error.message;

				if (! ctx.knowsAboutShowOutput) {
					vscode.window.showInformationMessage("use 'pbl: show output from last build' to open the output as a file")
					ctx.knowsAboutShowOutput = true;
				}

				vscode.window.showErrorMessage(error.message);
				ctx.outputChannel.appendLine(error.message);
				ctx.outputChannel.show();
				
				return;

			}

			buildData.output = (stdout != null) ? stdout : "Nothing to show"
			if (stderr) { buildData.output += "\n" + stderr }
			ctx.outputChannel.appendLine(buildData.output);
			vscode.window.setStatusBarMessage(`Build succeeded`);
		});

	});
	context.subscriptions.push(disposable);

	// Show output from last build
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.showbuildoutput', function () {

		if (noPebbleTooling()) { return }

		if (! buildData.built) {
			vscode.window.showWarningMessage('Nothing to display. Try building first');
		} else {
			let buildOutput = "-------------------------" + "\nOutput from last 'pebble build' @ " + buildData.time + "\n" + "-------------------------\n\n" + buildData.output
			vscode.workspace.openTextDocument({content: buildOutput, language: "java", fileName: "buildOutput.txt"})
		}

	}));

	// Self Check
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.selfCheck', function () {

		if (noPebbleTooling() == true) { 
			return 
		} else {
			vscode.window.showInformationMessage("Pebble SDK appears to be installed. Ready to go.", {modal:true})
		}

	}));

	// Install on emulator
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.install', function () {

		if (noPebbleTooling()) { return }
		installOnEmulator(ctx.emulator)

	}));
	function installOnEmulator(tempEmu = ctx.emulator) {
		

		var waitWindow = vscode.window.setStatusBarMessage(`Installing on ${tempEmu}...`);
		ctx.outputChannel.appendLine(`Installing on ${tempEmu}`);

		try {
			var pbldir = vscode.workspace.workspaceFolders[0].uri.fsPath;
			console.log("chgdir to " + pbldir);
			process.chdir(pbldir)
		} catch (e) {
			if (pbldir == undefined || pbldir == null) {
				ctx.outputChannel.appendLine("Building Aborted. Not a pebble project directory");
				vscode.window.showErrorMessage("Not a pebble project directory");
			} else {
				console.log("Could not change directory. Abort");
				vscode.window.showErrorMessage("Could not change directory to " + pbldir);
				buildData.output = "Could not change directory to " + pbldir
				ctx.outputChannel.appendLine(buildData.output)
			}
			vscode.window.setStatusBarMessage(`Build aborted`);
			return
		}


		exec(`pebble install --emulator ${tempEmu}`, (error, stdout, stderr) => {

			if (error) {
				buildData.installLog = error.message;
				vscode.window.showErrorMessage("Installation Failed. See Pebble output window for more", {modal: true});
				vscode.window.setStatusBarMessage(`Installation Failed`);
				ctx.outputChannel.appendLine(error.message);
				if (stderr) { ctx.outputChannel.appendLine(stderr) };
				return;
			}

			ctx.outputChannel.appendLine(stdout);
			vscode.window.setStatusBarMessage(`Installation succeeded`);
		});
	}

	//Change emulator
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.changeEmulator', function () {

		const emuPicker = vscode.window.showQuickPick([
			"aplite","basalt","chalk","diorite","emery"
		], {canPickMany: false});

		Promise.resolve()
  			.then(() => emuPicker)
  			.then(s => {
				console.log("Change emulator to " + s);
				if (["aplite","basalt","chalk","diorite","emery"].includes(s)) {
					ctx.emulator = s;
					vscode.window.setStatusBarMessage("Switched emulator to '" + ctx.emulator + "'");
				} else {
					if (s != null && s != undefined) {
						console.log("Unknown emulator")
						vscode.window.showWarningMessage("Unsupported option '" + s + '"');
					}
				}
  			});

		
		
	}));

	//Run on temporary emulator
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.tempEmulator', function () {

		const emuPicker = vscode.window.showQuickPick([
			"aplite","basalt","chalk","diorite","emery"
		], {canPickMany: false});

		Promise.resolve()
  			.then(() => emuPicker)
  			.then(s => {
				console.log("Launch single emulator as " + s);
				if (["aplite","basalt","chalk","diorite","emery"].includes(s)) {
					installOnEmulator(s)
				} else {
					if (s != null && s != undefined) {
						console.log("Unknown emulator")
						vscode.window.showWarningMessage("Unsupported option '" + s + '"');
					}
				}
  			});

		
		
	}));

	//Pebble command
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.pblCmd', function () {

		const pblCommand = vscode.window.showInputBox({
			"prompt": "Pebble command",
			"value": "pebble ",
			"valueSelection": [7,7]
		})

		Promise.resolve()
  			.then(() => pblCommand)
  			.then(cmd => {
				if (cmd.substr(0,7) != "pebble ") {
					console.log(cmd)
					vscode.window.showWarningMessage("Pebble command must start with 'pebble'");
				} else {
					console.log("Run pebble command " + cmd);
					ctx.outputChannel.show();
					ctx.outputChannel.appendLine("Run: '" + cmd + "'");
					{
						exec(cmd, (error, stdout, stderr) => {

							if (error) {

								buildData.installLog = error.message;
								vscode.window.showErrorMessage("Command failed");
								ctx.outputChannel.appendLine(error.message)
								return;

							} else {
								
								ctx.outputChannel.appendLine(stdout);
								
							}
				
						});
					}
				}

  			});

		
		
	}));

	//Generate UUID
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.generateUUID', function () {

		var newUid = uuidv4();
		const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            editor.edit(editBuilder => {
                editor.selections.forEach(sel => {
                    const range = sel.isEmpty ? document.getWordRangeAtPosition(sel.start) || sel : sel;
                    editBuilder.replace(range, newUid);
                })
            })
        }
		
	}));

	//Change phone IP
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.setPhoneIP', function () {

		setPhoneIP();
		
	}));

	//Install on phone
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.installOnPhone', function () {

		if (noPebbleTooling()) { return }
		installOnPhone();
		

	}));

	//Open output
	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.openOutputWindow', function () {

		ctx.outputChannel.show();		

	}));

	context.subscriptions.push(vscode.commands.registerCommand('pebble-tool.cleanBuildInstall', function () {

		//Callbacks in callbacks. Clean this up soon :)

		
		if (noPebbleTooling()) { return }

		//cd
		// vscode.window.setStatusBarMessage(`Wiping emulator clean`);
		// ctx.outputChannel.appendLine("Wiping emulator");
		try {
			var pbldir = vscode.workspace.workspaceFolders[0].uri.fsPath;
			console.log("chgdir to " + pbldir);
			process.chdir(pbldir)
		} catch (e) {
			if (pbldir == undefined || pbldir == null) {
				ctx.outputChannel.appendLine("Building Aborted. Not a pebble project directory");
				vscode.window.showErrorMessage("Not a pebble project directory");
			} else {
				console.log("Could not change directory. Abort");
				vscode.window.showErrorMessage("Could not change directory to " + pbldir);
				buildData.output = "Could not change directory to " + pbldir
				ctx.outputChannel.appendLine(buildData.output)
			}
			vscode.window.setStatusBarMessage(`Build aborted`);
			return
		}

		//Run wipe
		// exec("pebble wipe", (error, stdout, stderr) => {

		// 	if (error) {
		// 		vscode.window.showErrorMessage(error.message);
		// 		ctx.outputChannel.appendLine("Failed to wipe emulator");
		// 		ctx.outputChannel.appendLine(error.message);
		// 		ctx.outputChannel.show();
		// 		return;

		// 	}
		// 	buildData.output = (stdout != null && stdout != "") ? stdout : "Wipe Complete"
		// 	vscode.window.setStatusBarMessage(`Wipe succeeded`);

			//Build
			vscode.window.setStatusBarMessage(`Building app`);
			exec("pebble build", (error, stdout, stderr) => {

				if (error) {
					buildData.output = error.message;
	
					if (! ctx.knowsAboutShowOutput) {
						vscode.window.showInformationMessage("use 'pbl: show output from last build' to open the output as a file")
						ctx.knowsAboutShowOutput = true;
					}
	
					vscode.window.showErrorMessage(error.message);
					ctx.outputChannel.appendLine(error.message);
					ctx.outputChannel.show();
					
					return;
	
				}
	
				buildData.output = (stdout != null) ? stdout : "Nothing to show"
				if (stderr) { buildData.output += "\n" + stderr }
				ctx.outputChannel.appendLine(buildData.output);
				vscode.window.setStatusBarMessage(`Build succeeded`);
				installOnEmulator();

			});



		// });

	}));

	
	
	

}

function noPebbleTooling(asModal = true) {
	var whichPebble = "";
	var fail = false;

	try {
		whichPebble = execSync("which pebble")
	} catch (e) {
		fail = true
		console.log(e)
	}
	if (whichPebble == "") {
		fail = true
		console.log("Blank: " + whichPebble);
	}
		
	if (fail) {
		vscode.window.showErrorMessage("The Pebble Tooling is not installed, or is not in your PATH. For help setting this up, visit willow.systems/pebble-tool", {modal: asModal});
	}

	return fail
}
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
	  return v.toString(16);
	});
}
function setPhoneIP(reRunInstall) {

	const phoneIPAsk = vscode.window.showInputBox({
		"prompt": "Phone IP Address",
		"placeHolder": "192.168.1.5",
	})

	Promise.resolve()
		  .then(() => phoneIPAsk)
		  .then(resp => {
			if (resp == null || resp == undefined || resp == "") {
				return
			}
			ctx.phoneIP = resp.toString();
			if (reRunInstall) {
				installOnPhone();
			}
		  });

}
function installOnPhone() {
	if (ctx.phoneIP == "0.0.0.0") {
		setPhoneIP(true);
		return
	}

	vscode.window.setStatusBarMessage(`Installing on phone (${ctx.phoneIP})...`);
	ctx.outputChannel.appendLine(`Installing on phone (${ctx.phoneIP})...`);

	try {
		var pbldir = vscode.workspace.workspaceFolders[0].uri.fsPath;
		console.log("chgdir to " + pbldir);
		process.chdir(pbldir)
	} catch (e) {
		if (pbldir == undefined || pbldir == null) {
			ctx.outputChannel.appendLine("Building Aborted. Not a pebble project directory");
			vscode.window.showErrorMessage("Not a pebble project directory");
		} else {
			console.log("Could not change directory. Abort");
			vscode.window.showErrorMessage("Could not change directory to " + pbldir);
			buildData.output = "Could not change directory to " + pbldir
			ctx.outputChannel.appendLine(buildData.output)
		}
		vscode.window.setStatusBarMessage(`Build aborted`);
		return
	}


	exec(`pebble install --phone ${ctx.phoneIP}`, (error, stdout, stderr) => {

		if (error) {
			buildData.installLog = error.message;
			vscode.window.showErrorMessage("Installation Failed. See Pebble output window for more", {modal: true});
			vscode.window.setStatusBarMessage(`Installation Failed`);
			ctx.outputChannel.appendLine(error.message);
			if (stderr) { ctx.outputChannel.appendLine(stderr) };
			return;
		}

		ctx.outputChannel.appendLine(stdout);
		vscode.window.setStatusBarMessage(`Installation succeeded`);
	});
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
