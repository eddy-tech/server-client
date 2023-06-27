import { Component, OnInit } from '@angular/core';
import {ServerService} from './services/server.service';
import {AppState} from './interfaces/app-state';
import {CustomResponse} from './interfaces/custom-response';
import {BehaviorSubject, Observable, catchError, map, of, startWith} from 'rxjs';
import {DataState} from './enum/data-state.enum';
import {Status} from './enum/status.enum';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  appState$?: Observable<AppState<CustomResponse | null>>;
  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<string>('');
  private dataSubject = new BehaviorSubject<CustomResponse| null>(null);
  filterStatus$ = this.filterSubject.asObservable();
  selectedStatus: Status = Status.ALL;

  constructor(private serverService: ServerService) {}

  ngOnInit(): void {
    this.appState$ =  this.serverService.servers$
    .pipe(
      map(response => {
        this.dataSubject.next(response)
        return { dataState: DataState.LOADED_STATE, appData: response};
      }),
      startWith({ dataState: DataState.LOADING_STATE }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error});
      })
    )
  }


  pingServer(ipAddress: string): void {
    // Filtersubject is using for to get the IP address before fetching data from the server
    this.filterSubject.next(ipAddress);
    this.appState$ = this.serverService.ping$(ipAddress)
    .pipe(
      map(response => {
        const dataSubjectValue = this.dataSubject.value;
        if(dataSubjectValue && dataSubjectValue.data && dataSubjectValue.data.servers && response.data.server){
          const index = dataSubjectValue.data.servers.findIndex(server => server.id === response.data.server?.id);
          if(index !== -1)  dataSubjectValue.data.servers[index] = response.data.server;
        }
        this.filterSubject.next('');
        return { dataState: DataState.LOADED_STATE, appData: response };
      }),
      // datasubject is using here because when we have already fetch data from server in ngOnInit,
      // we need to get data or value before fetching ping address ip
      startWith({ dataState: DataState.LOADING_STATE, appData: this.dataSubject.value }),
      catchError((error : string) => {
        this.filterSubject.next('');
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    )
  }

  filterServers (status: Status): void {
    this.selectedStatus = status;
    if(this.dataSubject.value !== null){
      this.appState$ = this.serverService.filter$(status, this.dataSubject.value)
      .pipe(
        map(response => {
          return { dataState: DataState.LOADED_STATE, appData: response }
        }),
        startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
        catchError((error: string) => {
          return of({ dataState: DataState.ERROR_STATE, error });
        })
      )
    }
  }

  deleteServer(serverId: number): void {
    if(this.dataSubject.value !== null) {
      this.appState$ = this.serverService.delete$(serverId)
      .pipe(
        map(response => {
          return { dataState: DataState.LOADED_STATE, appData: response }
        }),
        startWith({ dataState: DataState.LOADING_STATE, appData: this.dataSubject.value }),
        catchError((error: string) => {
          return of({ dataState: DataState.ERROR_STATE, error })
        })
      )
    }
  }
}
