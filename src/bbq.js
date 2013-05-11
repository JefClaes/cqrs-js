var bbq = {

	bootstrap : function() {
		bbq.infrastructure.busInstance.register(new bbq.infrastructure.commandHandlerRegistration(
			'AddPieceOfMeat', function(command) { new bbq.commandHandlers.AddPieceOfMeatCommandHandler(command); 
		}));
		bbq.infrastructure.busInstance.register(new bbq.infrastructure.commandHandlerRegistration(
			'CreateBarbecue', function(command) { new bbq.commandHandlers.CreateBarbecueCommandHandler(command); 
		}));
		bbq.infrastructure.eventPublisherInstance.subscribe(new bbq.infrastructure.eventHandlerRegistration(
			'PieceOfMeatAdded', function(event) { bbq.readModels.itemsOnBbq.push(event.name);
		}));
		bbq.infrastructure.eventPublisherInstance.subscribe(new bbq.infrastructure.eventHandlerRegistration(
			'PieceOfMeatAdded', function(event) { bbq.readModels.pieceOfMeatCount++;
		}));
		bbq.infrastructure.eventPublisherInstance.subscribe(new bbq.infrastructure.eventHandlerRegistration(
			'PieceOfMeatAdded', function(event) { bbq.readModels.peopleWaitingForTheirMeat.push(event.belongsTo);
		}));
		bbq.infrastructure.eventPublisherInstance.subscribe(new bbq.infrastructure.eventHandlerRegistration(
			'BarbecueCreated', function(event) { bbq.readModels.createdBarbecues.push(event.bbqId);
		}));
	},

	infrastructure : {

		guard : {
			forFalsy : function(value, description) {
				if (!value) {
					throw new Error(description + ' should not be falsy');
				}
			},
			forNonFunctions : function(value, description) {
				if (typeof(value) !== 'function') {
					throw new Error(description + ' should be a function')
				}
			}
		},

		busInstance : {					
			_handlerRegistrations : { },

			register : function(commandHandlerRegistration) {
				bbq.infrastructure.guard.forFalsy(commandHandlerRegistration, 'commandHandlerRegistration');

				this._handlerRegistrations[commandHandlerRegistration.getName()] = commandHandlerRegistration;
			},

			dispatch : function(command) {
				bbq.infrastructure.guard.forFalsy(command, 'command');

				var registration = this._handlerRegistrations[command.$name];

				if (registration) {
					registration.invokeHandler(command);
				}								
			}									
		},

		eventPublisherInstance : {		
			_eventHandlerRegistrations : [],

			subscribe : function(eventHandlerRegistration) {
				bbq.infrastructure.guard.forFalsy(eventHandlerRegistration, 'eventHandlerRegistration');
				
				this._eventHandlerRegistrations.push(eventHandlerRegistration);
			},

			publish : function(event) {
				for (var i = 0; i < this._eventHandlerRegistrations.length; i++) {
					var registration = this._eventHandlerRegistrations[i];
					if (registration.handles(event.$name)) {
						registration.invokeHandler(event);
					}
				}
			}					
		},	

		commandHandlerRegistration : function(commandName, commandHandler) {
			bbq.infrastructure.guard.forFalsy(commandName, 'commandName');
			bbq.infrastructure.guard.forFalsy(commandHandler, 'createCommandHandler');
			bbq.infrastructure.guard.forNonFunctions(commandHandler, 'createCommandHandler');				
			
			var commandName = commandName;
			var commandHandler = commandHandler;

			this.getName = function() {					
				return commandName;
			};

			this.invokeHandler = function(command) {											
				commandHandler(command);
			};
		},

		eventHandlerRegistration : function(eventName, eventHandler) {
			bbq.infrastructure.guard.forFalsy(eventName, 'eventName');
			bbq.infrastructure.guard.forFalsy(eventHandler, 'eventHandler');
			bbq.infrastructure.guard.forNonFunctions(eventHandler, 'eventHandler');				

			var eventName = eventName;
			var eventHandler = eventHandler;

			this.handles = function(event) {
				return eventName === event;
			};

			this.invokeHandler = function(event) {
				eventHandler(event);
			};
		}


	},

	commands : {

		CreateBarbecueCommand : function(bbqId) {
			bbq.infrastructure.guard.forFalsy(bbqId, 'bbqId');

			this.$name = 'CreateBarbecue';
			this.bbqId = bbqId;
		},

		AddPieceOfMeatCommand : function(bbqId, name, belongsTo) {
			bbq.infrastructure.guard.forFalsy(bbqId, 'bbqId');
			bbq.infrastructure.guard.forFalsy(name, 'name');
			bbq.infrastructure.guard.forFalsy(belongsTo, 'belongsTo');					

			this.$name = 'AddPieceOfMeat';
			this.bbqId = bbqId;
			this.name = name;
			this.belongsTo = belongsTo;
		}

	},

	commandHandlers : {

		CreateBarbecueCommandHandler : function(command) {											
			bbq.domain.barbecueRepositoryInstance.add(
				new bbq.domain.Barbecue(command.bbqId));
		},

		AddPieceOfMeatCommandHandler : function(command) {
			var barbecue = bbq.domain.barbecueRepositoryInstance.getBydId(command.bbqId);

			bbq.infrastructure.guard.forFalsy(barbecue, 'barbecue');

			barbecue.addPieceOfMeat(
				new bbq.domain.PieceOfMeat(
					command.name, command.belongsTo));
		}

	},

	events : {

		PieceOfMeatAdded : function(name, belongsTo) {
			bbq.infrastructure.guard.forFalsy(name, 'name');
			bbq.infrastructure.guard.forFalsy(belongsTo, 'belongsTo');

			this.$name = 'PieceOfMeatAdded';
			this.name = name;
			this.belongsTo = belongsTo;
		},

		BarbecueCreated : function(bbqId) {
			bbq.infrastructure.guard.forFalsy(bbqId, 'bbqId');

			this.$name = 'BarbecueCreated';			
			this.bbqId = bbqId;
		}

	},

	domain : {				

		barbecueRepositoryInstance : {
			_barbecues : { },

			getBydId : function(id) {
				return this._barbecues[id]
			},

			add : function(bbq) {											
				this._barbecues[bbq.id] = bbq;
			}

		},

		Barbecue : function(id) {				
			var pieces = [];

			this.id = id;

			bbq.infrastructure.eventPublisherInstance.publish(
				new bbq.events.BarbecueCreated(id));

			this.addPieceOfMeat = function(pieceOfMeat) {
				bbq.infrastructure.guard.forFalsy(pieceOfMeat, 'pieceOfMeat');				

				pieces.push(pieceOfMeat);					

				bbq.infrastructure.eventPublisherInstance.publish(
					new bbq.events.PieceOfMeatAdded(
						pieceOfMeat.getName(), 
						pieceOfMeat.getBelongsTo()));
			}					

		},

		PieceOfMeat : function(name, belongsTo) {
			bbq.infrastructure.guard.forFalsy(name, 'name should have a value');
			bbq.infrastructure.guard.forFalsy(belongsTo, 'belongsTo');				

			var name = name;
			var belongsTo = belongsTo;					 

			this.getName = function() {
				return name;
			};
			this.getBelongsTo = function() {
				return belongsTo;
			};
		}

	},

	readModels : {

		itemsOnBbq : [],

		pieceOfMeatCount : 0,

		createdBarbecues : [],

		peopleWaitingForTheirMeat : []

	}

};			

