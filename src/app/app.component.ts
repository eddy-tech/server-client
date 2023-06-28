import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {ServerService} from './services/server.service';
import {AppState} from './interfaces/app-state';
import {CustomResponse} from './interfaces/custom-response';
import {BehaviorSubject, Observable, catchError, map, of, startWith} from 'rxjs';
import {DataState} from './enum/data-state.enum';
import {Status} from './enum/status.enum';
import { NgForm } from '@angular/forms';
import {Server} from './interfaces/server';
import {NotificationService} from './services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  appState$?: Observable<AppState<CustomResponse | null>>;
  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<string>('');
  private dataSubject = new BehaviorSubject<CustomResponse| null>(null);
  filterStatus$ = this.filterSubject.asObservable();
  selectedStatus: Status = Status.ALL;
  private isLoading = new BehaviorSubject<Boolean>(false);
  isLoading$ = this.isLoading.asObservable();


  constructor(private serverService: ServerService, private notifier: NotificationService) {}

  ngOnInit(): void {
    this.appState$ =  this.serverService.servers$
    .pipe(
      map(response => {
        this.notifier.onDefault(response.message);
        this.dataSubject.next(response)
        return { dataState: DataState.LOADED_STATE, appData: {
          ...response,
          data: {
            servers: response.data.servers.reverse()
          }
        }};
      }),
      startWith({ dataState: DataState.LOADING_STATE }),
      catchError((error: string) => {
        this.notifier.onError(error);
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
        this.notifier.onDefault(response.message);
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
        this.notifier.onError(error);
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
          this.notifier.onDefault(response.message);
          return { dataState: DataState.LOADED_STATE, appData: response }
        }),
        startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
        catchError((error: string) => {
          this.notifier.onError(error);
          return of({ dataState: DataState.ERROR_STATE, error });
        })
      )
    }
  }

  saveSever(serverForm: NgForm ): void {
    this.isLoading.next(true);
    this.appState$ = this.serverService.save$(serverForm.value as Server)
    .pipe(
      map(response => {
        this.notifier.onSuccess(response.message);
        this.dataSubject.next({
            ...response,
            data: {
              servers: [
                // response.data.server,
                ...(this.dataSubject.value?.data.servers ?? [])
              ]
            }
          }
        );
        document.getElementById('closeModal')?.click();
        this.isLoading.next(false);
        serverForm.resetForm({ status: Status.SERVER_DOWN });
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error : string) => {
        this.isLoading.next(false);
        this.notifier.onError(error);
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  deleteServer(server: Server): void {
    this.appState$ = this.serverService.delete$(server.id)
      .pipe(
        map(response => {
          this.notifier.onSuccess(response.message);
          this.dataSubject.next({
            ...response,
            data: {
              // ?? opérateur de coalescence null pour fournir un tableau vide []
              servers: (this.dataSubject.value?.data.servers ?? []).filter(s => s.id !== server.id)
            }
          })
          return { dataState: DataState.LOADED_STATE, appData: response }
        }),
        startWith({ dataState: DataState.LOADING_STATE, appData: this.dataSubject.value }),
        catchError((error: string) => {
          this.notifier.onError(error);
          return of({ dataState: DataState.ERROR_STATE, error })
        })
      )
  }

  printReport(): void {
    // window.print();
    this.notifier.onInfo("Report downloaded successfully");
    let dataType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    let tableSelect = document.getElementById('servers');
    let tableHtml = tableSelect?.outerHTML.replace(/ /g, '%20');
    let downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);
    downloadLink.href = 'data:' + dataType + ', ' + tableHtml;
    downloadLink.download = 'server-report.xls';
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
}
