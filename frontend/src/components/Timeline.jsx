export default function Timeline({ events = [] }) {

  return (

    <div className="panel">

      <div className="panel-title">
        TIMELINE
      </div>


      <div className="p-3 space-y-2">

        {events.length === 0 ? (

          <div className="text-[10px] text-slate-600 font-mono">
            NO TEMPORAL EVENTS
          </div>

        ) : (

          events.map((event, index) => (

            <div
              key={`${event.timestamp || "unknown"}-${index}`}
              className="border-l border-blue-500/30 pl-3 py-1"
            >

              {/* TIME */}
              <div className="font-mono text-[9px] text-blue-400">
                {event.timestamp || "TIME UNKNOWN"}
              </div>


              {/* ENTITY / EVENT */}
              <div className="text-xs text-slate-200 mt-1">
                {event.label ||
                  event.entity_name ||
                  "UNKNOWN ENTITY"}
              </div>


              {/* EVENT TYPE */}
              {event.type && (

                <div className="text-[8px] text-slate-600 font-mono mt-1 uppercase">
                  {event.type}
                </div>

              )}

            </div>

          ))

        )}

      </div>

    </div>

  );

}