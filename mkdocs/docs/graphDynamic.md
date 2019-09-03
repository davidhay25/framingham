Dynamic scenarios (where the scenario changes over time reflecting a process of some sort) are not really supported well at this time.

One way that this could be done (which does require the track to be set up properly) is as follows.

###Setup

1. [Create a track](createTrack.md) for the dynamic scenario (each track should have only one dynamic scenario).
2. [Create a scenario](createScenario.md) in the track for each of the steps in the process.

###Creating the graph

1. Select the first scenario and create the graph. Optionally save to the server.
2. Select the next scenario. Click the **import** link below the scenario selector and import the scenario you just created. Modify as required to represent the next step in the process. Optionally save to the server.
3. Select the next scenario and import the previous one. Modify and optionally save.
4. repeat as required.

Note that each graph is creating a new resource instance when importing, so this doesn't really reflect changes to a single resource over time. In fact, there is no real value in saving to the server if all you wanted to do was to see the changing resources.